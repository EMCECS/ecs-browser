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

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import javax.servlet.http.HttpServletRequest;
import javax.xml.bind.JAXBContext;

import org.eclipse.jetty.util.StringUtil;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.emc.object.Method;
import com.emc.object.s3.S3Config;
import com.emc.object.s3.S3SignerV2;
import com.emc.object.s3.bean.AccessControlList;
import com.emc.object.s3.bean.ConcreteAccessControlList;
import com.emc.object.s3.bean.ListBucketsResult;
import com.emc.object.s3.bean.ListDataNode;
import com.emc.object.s3.bean.ListObjectsResult;
import com.emc.object.s3.bean.ListVersionsResult;
import com.emc.object.s3.bean.QueryObjectsResult;
import com.emc.object.s3.bean.S3Object;
import com.emc.object.s3.bean.VersioningConfiguration;
import com.emc.object.s3.jersey.S3JerseyClient;
import com.emc.object.s3.request.PresignedUrlRequest;
import com.emc.object.s3.bean.SlimCopyObjectResult;
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

    private static final String PROXY_SUBPATH = "/proxy";

    private static final String PROXY_PATH = SERVLET_PATH + PROXY_SUBPATH;

    @RequestMapping(value = PROXY_SUBPATH + "/**", method = RequestMethod.POST, produces="*/*", consumes="*/*")
    public ResponseEntity<?> postProxy(HttpServletRequest request) throws Exception {
        S3Config s3Config = getS3Config(request);
        HttpMethod method = getMethod(request);

        String resource = request.getRequestURI();
        resource = resource.substring(resource.indexOf(PROXY_PATH) + PROXY_PATH.length());
        if (!resource.startsWith("/")) {
            resource = "/" + resource;
        } else  {
            while (resource.startsWith("//")) {
                resource = resource.substring(1);
            }
        }

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

        if (StringUtil.isNotBlank(s3Config.getNamespace())) {
            RestUtil.putSingle(headers, RestUtil.EMC_NAMESPACE, s3Config.getNamespace());
            // TODO: handle namespace in URL
        }

        byte[] data = null;
        if (HttpMethod.POST.equals(method)) {
            data = readBody(request);
        } else if (HttpMethod.PUT.equals(method) && (!copySource)) {
            if (!(request instanceof MultipartHttpServletRequest)) {
                data = readBody(request);
                data = convertToXmlAsNeeded( data, parameters, headers );
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
        int dataLength = ( data == null ) ? 0 : data.length;
        RestUtil.putSingle(headers, "Content-Length", Integer.toString(dataLength));

        Object dataToReturn = null;
        if ("presign".equals(request.getHeader("X-Passthrough-Type"))) {
            while (resource.startsWith( "/" ) ) {
                resource = resource.substring(1);
            }

            int delimiterIndex = resource.indexOf( "/" );
            String bucketName = null;
            String key = null;
            if ( delimiterIndex < 0 ) {
                bucketName = resource;
            } else {
                bucketName = resource.substring( 0, delimiterIndex );
                if ( delimiterIndex + 1 < resource.length() ) {
                    key = resource.substring( delimiterIndex + 1 );
                }
            }

            Date expirationTime = new Date();
            expirationTime.setTime(Long.parseLong(request.getHeader("X-Passthrough-Expires")));
            PresignedUrlRequest presignedUrlRequest = new PresignedUrlRequest(Method.valueOf(getMethodName(request)), bucketName, key, expirationTime);
            presignedUrlRequest.setVersionId(parameters.get("versionId"));
            presignedUrlRequest.setNamespace(s3Config.getNamespace());
            S3SignerV2 s3Signer = new S3SignerV2(s3Config);
            dataToReturn = s3Signer.generatePresignedUrl(presignedUrlRequest).toString();
        } else if ("download".equals(request.getHeader("X-Passthrough-Type"))) {
            String downloadFolder = request.getHeader("X-Passthrough-Download-Folder");
            if (StringUtil.isBlank(downloadFolder)) {
                downloadFolder = "/usr/src/app/";
            }

            sign(method.toString(), resource, parameters, headers, s3Config);

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
            String endpoint = request.getHeader("X-Passthrough-Endpoint");
            while (endpoint.endsWith("/")) {
                endpoint = endpoint.substring(0, endpoint.length() - 1);
            }
            resource = endpoint + resource;
    
            RequestEntity<byte[]> requestEntity = new RequestEntity<byte[]>(data, newHeaders, method, new URI(resource));
            RestTemplate client = new RestTemplate();
            try {
                dataToReturn = client.exchange(requestEntity, ListObjectsResult.class);
                if ( ((ResponseEntity<ListObjectsResult>) dataToReturn).getStatusCode().is2xxSuccessful() ) {
                    ListObjectsResult objectsToDownload = ((ResponseEntity<ListObjectsResult>) dataToReturn).getBody();
                    downloadObjects( downloadFolder, objectsToDownload.getBucketName(), objectsToDownload.getObjects(), s3Config );
                }
            } catch (HttpClientErrorException e) {
                dataToReturn = new ErrorData(e); // handle and display on the other end
            } catch (Exception e) {
                dataToReturn = new ErrorData(e); // handle and display on the other end
            }
        } else {
            sign(method.toString(), resource, parameters, headers, s3Config);

            HttpHeaders newHeaders = new HttpHeaders();
            for (Entry<String, List<Object>> header : headers.entrySet()) {
                List<String> headerValue = new ArrayList<String>(header.getValue().size());
                for (Object value : header.getValue()) {
                    headerValue.add((String) value);
                }
                newHeaders.put(header.getKey(), headerValue);
            }
    
            Class<?> responseClass = null;
            if (resource.length() <= 1) { // no bucket name exists
                if (parameters.containsKey("endpoint")) {
                    responseClass = ListDataNode.class;
                } else {
                    responseClass = ListBucketsResult.class;
                }
            } else {
                if (parameters.containsKey("acl")) {
                    responseClass = AccessControlList.class;
                } else if (parameters.containsKey("query")) {
                    responseClass = QueryObjectsResult.class;
                } else if (parameters.containsKey("versioning")) {
                    responseClass = VersioningConfiguration.class;
                } else if (parameters.containsKey("versions")) {
                    responseClass = ListVersionsResult.class;
                } else {
                    int firstSlash = resource.indexOf('/', 2);
                    if (firstSlash < 0) { // no object name exists
                        responseClass = ListObjectsResult.class;
                    } else if (copySource) {
                        responseClass = SlimCopyObjectResult.class;
                    } else { // ugly hack, fix this
                        responseClass = ListBucketsResult.class;
                    }
                }
            }

            String queryString = RestUtil.generateRawQueryString(parameters);
            if (StringUtil.isNotBlank(queryString)) {
                resource = resource + "?" + queryString;
            }
            String endpoint = request.getHeader("X-Passthrough-Endpoint");
            while (endpoint.endsWith("/")) {
                endpoint = endpoint.substring(0, endpoint.length() - 1);
            }
            resource = endpoint + resource;
    
            RequestEntity<byte[]> requestEntity = new RequestEntity<byte[]>(data, newHeaders, method, new URI(resource));
            RestTemplate client = new RestTemplate();
            try {
                dataToReturn = new WrappedResponseEntity( client.exchange(requestEntity, responseClass) );
            } catch (HttpClientErrorException e) {
                dataToReturn = new ErrorData(e); // handle and display on the other end
            }
        }
        return ResponseEntity.ok( dataToReturn );
    } 

    /**
     * @param downloadFolder
     * @param objects
     * @param s3Config
     * @throws Exception 
     */
    private void downloadObjects(String downloadFolder, String bucketName, List<S3Object> objects, S3Config s3Config) throws Exception {
        File downloadBucketParent = new File( downloadFolder );
        File downloadBucket = new File( downloadBucketParent, bucketName );
        if ( !downloadBucket.exists() ) {
            if ( !downloadBucket.mkdirs() ) {
                throw new Exception( "Download location cannot be created: " + downloadBucket.getAbsolutePath() );
            }
        } else if ( downloadBucket.isDirectory() ) {
            throw new Exception( "Download location is not a folder: " + downloadBucket.getAbsolutePath() );
        }

        S3JerseyClient client = new S3JerseyClient( s3Config );
        for ( S3Object object : objects ) {
            String key = object.getKey();
            File file = new File( downloadBucket, key );
            if ( !file.getParentFile().exists() ) {
                file.getParentFile().mkdirs();
            }
            final Path destination = Paths.get(file.getAbsolutePath());
            try (
                final InputStream inputStream = client.getObject(bucketName, key).getObject();
            ) {
                Files.copy(inputStream, destination);
            }
        }
    }

    /**
     * @param request
     * @return
     * @throws Exception
     */
    private S3Config getS3Config(HttpServletRequest request) throws Exception {
        String passthroughNamespace = request.getHeader("X-Passthrough-Namespace");
        String passthroughEndpoint = request.getHeader("X-Passthrough-Endpoint");
        String passthroughAccessKey = request.getHeader("X-Passthrough-Key");
        String passthroughSecretKey = request.getHeader("X-Passthrough-Secret");
        while (passthroughEndpoint.endsWith("/")) {
            passthroughEndpoint = passthroughEndpoint.substring(0, passthroughEndpoint.length() - 1);
        }
        S3Config s3Config = new S3Config(new URI(passthroughEndpoint));
        s3Config.setIdentity(passthroughAccessKey);
        s3Config.setSecretKey(passthroughSecretKey);
        if (StringUtil.isNotBlank(passthroughNamespace)) {
            s3Config.setNamespace(passthroughNamespace);
        }
        return s3Config;
    }

    /**
     * @param data
     * @param parameters 
     * @param headers 
     * @param responseClass
     * @return
     * @throws Exception
     */
    private byte[] convertToXmlAsNeeded(byte[] data, Map<String, String> parameters, Map<String, List<Object>> headers) throws Exception {
        Class<?> outputClass = null;
        if (parameters.containsKey("acl")) {
            outputClass = AccessControlList.class;
        } else if (parameters.containsKey("versioning")) {
            outputClass = VersioningConfiguration.class;
        }

        if (outputClass == null) { // do nothing
            return data;
        }

        Object outputObject;
        ObjectMapper objectMapper = new ObjectMapper();
        if (outputClass == AccessControlList.class) {
            ConcreteAccessControlList jsonObject = objectMapper.readValue(data, ConcreteAccessControlList.class);
            outputObject = jsonObject.toAccessControlList();
        } else {
            outputObject = objectMapper.readValue(data, outputClass);
        }
        JAXBContext context = JAXBContext.newInstance(outputClass);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        context.createMarshaller().marshal(outputObject, outputStream);
        data =  outputStream.toByteArray();

        RestUtil.putSingle(headers, "Content-Type", "application/xml");

//        System.out.println(outputClass.getName() + ": \"" + new String(data, StandardCharsets.UTF_8) + "\"");
//        System.out.println("Headers:");
//        for (Entry<String, List<Object>> header : headers.entrySet()) {
//            String allValues = "";
//            String separator = "";
//            for (Object value : header.getValue()) {
//                allValues = allValues + separator + value.toString();
//                separator = ",";
//            }
//            System.out.println(">> " + header.getKey() + ": " + allValues);
//        }

        return data;
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
     * @param s3Config
     */
    private void sign(String method, String resource, Map<String, String> parameters, Map<String, List<Object>> headers,
            S3Config s3Config) {
        if (StringUtil.isBlank(s3Config.getSecretKey())) {
            // no auth secret; skip signing, e.g. for public read-only buckets.
            return;
        }

        S3SignerV2 s3Signer = new S3SignerV2(s3Config);
        System.out.println("Signing string: " + s3Signer.getStringToSign(method, resource, parameters, headers));
        s3Signer.sign(method, resource, parameters, headers);
    }

    /**
     * @param request
     * @return
     */
    private static final HttpMethod getMethod(HttpServletRequest request) {
        return HttpMethod.valueOf(getMethodName(request));
    }

    /**
     * @param request
     * @return
     */
    private static String getMethodName(HttpServletRequest request) {
        return request.getHeader("X-Passthrough-Method");
    }

    /**
     * @param list
     * @return
     */
    private Boolean isNotEmpty(List list) {
        return ((list != null) && (list.size() > 0));
    }

    private static class ErrorData {

        final public int status;
        final public String statusText;
        final public String message;
        final public String responseBody;

        /**
         * @param e
         */
        public ErrorData(HttpClientErrorException e) {
            status = e.getStatusCode().value();
            statusText = e.getStatusText();
            message = e.getMessage();
            responseBody = e.getResponseBodyAsString();
        }

        /**
         * @param e
         */
        public ErrorData(Exception e) {
            status = 500;
            statusText = "Server Error";
            message = e.getMessage();
            responseBody = "";
        }

        public int getStatus() {
            return status;
        }

        public String getStatusText() {
            return statusText;
        }

        public String getMessage() {
            return message;
        }

        public String getResponseBody() {
            return responseBody;
        }

    }

}
