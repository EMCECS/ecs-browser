/**
 * Copyright 2017 EMC Corporation. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0.txt
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
package com.emc.ecs.browser.spring;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.http.HttpServletRequest;

import org.eclipse.jetty.util.StringUtil;
import org.springframework.boot.autoconfigure.web.HttpMessageConverters;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.HandlerMapping;

import com.emc.object.s3.S3Config;
import com.emc.object.s3.S3SignerV2;
import com.emc.object.s3.bean.AccessControlList;
import com.emc.object.s3.bean.CopyObjectResult;
import com.emc.object.s3.bean.ListBucketsResult;
import com.emc.object.s3.bean.ListObjectsResult;
import com.emc.object.util.RestUtil;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * @author seibed
 *
 */
@RestController
@RequestMapping(ServiceController.SERVLET_PATH)
public class ServiceController {

    protected static final String SERVLET_PATH = "/service";

    private static final String PROXY_SUBPATH = "/proxy/";

    private static final String PROXY_PATH = SERVLET_PATH + PROXY_SUBPATH;

    @RequestMapping(value = PROXY_SUBPATH + "**", method = RequestMethod.POST, produces="application/json", consumes="*/*")
    public ResponseEntity<?> postProxy(HttpServletRequest request) throws Exception {
        HttpMethod method = getMethod(request);

        String resource = request.getRequestURI();
        resource = resource.substring(resource.indexOf(PROXY_PATH) + PROXY_PATH.length() - 1);

        Map<String, String> parameters = RestUtil.getQueryParameterMap(request.getQueryString());

        boolean copySource = false;
        Map<String, List<Object>> headers = new HashMap<String, List<Object>>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            if ("accept".equalsIgnoreCase(headerName)) {
                RestUtil.putSingle(headers, "Accept", "application/xml");
            } else if (!headerName.startsWith("X-Passthrough-")) {
                List<Object> headerValue = new ArrayList<Object>();
                Enumeration<String> headerValues = request.getHeaders(headerName);
                while (headerValues.hasMoreElements()) {
                    headerValue.add(headerValues.nextElement());
                }
                headers.put(headerName, headerValue);
                if ("x-amz-copy-source".equalsIgnoreCase(headerName) && isNotEmpty(headerValue)) {
                    copySource = true;
                    RestUtil.putSingle(headers, "Expect", "100-continue");
                    RestUtil.putSingle(headers, "Content-Encoding", "identity");
                }
            }
        }

        byte[] data = null;
        if (HttpMethod.POST.equals(method)) {
            data = readBody(request);
        } else if (HttpMethod.PUT.equals(method) && (!copySource)) {
            if (!(request instanceof MultipartHttpServletRequest)) {
                data = readBody(request);
            } else {
                MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
                Iterator<String> itr = multipartRequest.getFileNames();
                MultipartFile file = multipartRequest.getFile(itr.next());
                InputStream inputStream = file.getInputStream();
                try {
                    data = new byte[inputStream.available()];
                    inputStream.read(data);
                } finally {
                    inputStream.close();
                }
            }
        }

        String passthroughNamespace = request.getHeader("X-Passthrough-Namespace");
        if (StringUtil.isNotBlank(passthroughNamespace)) {
            RestUtil.putSingle(headers, RestUtil.EMC_NAMESPACE, passthroughNamespace);
            // TODO: handle namespace in URL
        }

        sign(method.toString(), resource, parameters, headers, request.getHeader("X-Passthrough-Key"),
                request.getHeader("X-Passthrough-Secret"));

        Class<?> responseClass = ListBucketsResult.class;
        if (resource.length() > 1) { // bucket name exists
            if (parameters.containsKey("acl")) {
                responseClass = AccessControlList.class;
            } else {
                int firstSlash = resource.indexOf('/', 2);
                if (firstSlash < 0) { // no object name exists
                    responseClass = ListObjectsResult.class;
                } else if (copySource) {
                    responseClass = CopyObjectResult.class;
                }
            }
        }

        HttpHeaders newHeaders = new HttpHeaders();
        for (Entry<String, List<Object>> header : headers.entrySet()) {
            List<String> headerValue = new ArrayList<String>(header.getValue().size());
            for (Object value : header.getValue()) {
                headerValue.add((String) value);
            }
            newHeaders.put(header.getKey(), headerValue);
        }

        String queryString = RestUtil.generateRawQueryString(parameters);
        if (StringUtil.isNotBlank(queryString)) {
            resource = resource + "?" + queryString;
        }
        resource = request.getHeader("X-Passthrough-Endpoint") + resource;

        RequestEntity<byte[]> requestEntity = new RequestEntity<byte[]>(data, newHeaders, method, new URI(resource));
        RestTemplate client = new RestTemplate();
        return ResponseEntity.ok(client.exchange(requestEntity, responseClass));
    } 

    /**
     * @param request
     * @return
     * @throws Exception 
     */
    private byte[] readBody(HttpServletRequest request) throws Exception {
        byte[] buffer = new byte[request.getContentLength()];
        request.getInputStream().read(buffer);
        return buffer;
    }

    /**
     * @param method
     * @param resource
     * @param parameters
     * @param headers
     * @param passthroughAccessKey
     * @param passthroughSecretKey
     */
    private void sign(String method, String resource, Map<String, String> parameters, Map<String, List<Object>> headers,
            String passthroughAccessKey, String passthroughSecretKey) {
        if (StringUtil.isBlank(passthroughSecretKey)) {
            // no auth secret; skip signing, e.g. for public read-only buckets.
            return;
        }

        S3Config s3Config = new S3Config();
        s3Config.setIdentity(passthroughAccessKey);
        s3Config.setSecretKey(passthroughSecretKey);
        S3SignerV2 s3Signer = new S3SignerV2(s3Config);

        s3Signer.sign(method, resource, parameters, headers);

    }

    /**
     * @param request
     * @return
     */
    private static final HttpMethod getMethod(HttpServletRequest request) {
        return HttpMethod.valueOf(request.getHeader("X-Passthrough-Method"));
    }

    // /**
    // * @param request
    // * @return
    // * @throws Exception
    // */
    // private static final S3JerseyClient getClient(HttpServletRequest request)
    // throws Exception {
    // String passthroughNamespace =
    // request.getHeader("X-Passthrough-Namespace");
    // String passthroughEndpoint = request.getHeader("X-Passthrough-Endpoint");
    // String passthroughAccessKey = request.getHeader("X-Passthrough-Key");
    // String passthroughSecretKey = request.getHeader("X-Passthrough-Secret");
    // S3Config s3Config = new S3Config(new URI(passthroughEndpoint));
    // s3Config.setIdentity(passthroughAccessKey);
    // s3Config.setSecretKey(passthroughSecretKey);
    // if (StringUtil.isNotBlank(passthroughNamespace)) {
    // s3Config.setNamespace(passthroughNamespace);
    // }
    // return new S3JerseyClient(s3Config);
    // }

    /**
     * @param list
     * @return
     */
    private Boolean isNotEmpty(List list) {
        return ((list != null) && (list.size() > 0));
    }

    private static final class EmptyResponseEntity {

        private final HttpHeaders headers;

        private final HttpStatus statusCode;

        /**
         * @param bareResponse
         */
        public EmptyResponseEntity(ResponseEntity<?> bareResponse) {
            headers = bareResponse.getHeaders();
            statusCode = bareResponse.getStatusCode().is2xxSuccessful() ? HttpStatus.NO_CONTENT : bareResponse.getStatusCode();
            System.err.println(getStatusCode().toString());
        }

        public String getBody() {
            return "";
        }

        public HttpHeaders getHeaders() {
            return headers;
        }

        public HttpStatus getStatusCode() {
            return statusCode;
        }

    }
}
