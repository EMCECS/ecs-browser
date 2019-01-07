/**
 * Copyright 2017-2018 Dell Inc. or its subsidiaries. All rights reserved.
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
import java.io.InputStream;
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

    private static final String SEPARATOR = "/";

    private static final String DOUBLE_SEPARATOR = SEPARATOR + SEPARATOR;

    private static final String PASSTHROUGH_HEADER_START = "X-Passthrough-";

    private static final String ENDPOINT_HEADER = PASSTHROUGH_HEADER_START + "Endpoint";

    private static final String METHOD_HEADER = PASSTHROUGH_HEADER_START + "Method";

    private static final String NAMESPACE_HEADER = PASSTHROUGH_HEADER_START + "Namespace";

    private static final String KEY_HEADER = PASSTHROUGH_HEADER_START + "Key";

    private static final String SECRET_HEADER = PASSTHROUGH_HEADER_START + "Secret";

    private static final String TYPE_HEADER = PASSTHROUGH_HEADER_START + "Type";

    private static final String EXPIRES_HEADER = PASSTHROUGH_HEADER_START + "Expires";

    private static final String DOWNLOAD_FOLDER_HEADER = PASSTHROUGH_HEADER_START + "Download-Folder";

    private static final String MARKER_PARAMETER = "marker";

    @RequestMapping(value = PROXY_SUBPATH + "/**", method = RequestMethod.POST, produces="*/*", consumes="*/*")
    public ResponseEntity<?> postProxy(HttpServletRequest request) throws Exception {
        S3Config s3Config = getS3Config(request);
        HttpMethod method = HttpMethod.valueOf(request.getHeader(METHOD_HEADER));

        String endpoint = request.getHeader(ENDPOINT_HEADER);
        while (endpoint.endsWith(SEPARATOR)) {
            endpoint = endpoint.substring(0, endpoint.length() - 1);
        }

        String resource = request.getRequestURI();
        resource = resource.substring(resource.indexOf(PROXY_PATH) + PROXY_PATH.length());
        if (!resource.startsWith(SEPARATOR)) {
            resource = SEPARATOR + resource;
        } else  {
            while (resource.startsWith(DOUBLE_SEPARATOR)) {
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
            } else if (!headerName.startsWith(PASSTHROUGH_HEADER_START)) {
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
        if ("presign".equals(request.getHeader(TYPE_HEADER))) {
            while (resource.startsWith( SEPARATOR ) ) {
                resource = resource.substring(1);
            }

            int delimiterIndex = resource.indexOf( SEPARATOR );
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
            expirationTime.setTime(Long.parseLong(request.getHeader(EXPIRES_HEADER)));
            PresignedUrlRequest presignedUrlRequest = new PresignedUrlRequest(Method.valueOf(request.getHeader(METHOD_HEADER)), bucketName, key, expirationTime);
            presignedUrlRequest.setVersionId(parameters.get("versionId"));
            presignedUrlRequest.setNamespace(s3Config.getNamespace());
            S3SignerV2 s3Signer = new S3SignerV2(s3Config);
            dataToReturn = s3Signer.generatePresignedUrl(presignedUrlRequest).toString();
        } else if ("download".equals(request.getHeader(TYPE_HEADER))) {
            String downloadFolder = request.getHeader(DOWNLOAD_FOLDER_HEADER);
            if (StringUtil.isBlank(downloadFolder)) {
                downloadFolder = "/usr/src/app/";
            }

            RequestEntity<byte[]> requestEntity = getRequestEntity( data, resource, parameters, headers, method, endpoint, s3Config );
            RestTemplate client = new RestTemplate();
            try {
                dataToReturn = new WrappedResponseEntity( client.exchange(requestEntity, ListObjectsResult.class) );
                ListObjectsResult objectsToDownload = ((ResponseEntity<ListObjectsResult>) dataToReturn).getBody();
                downloadObjects( downloadFolder, objectsToDownload.getBucketName(), objectsToDownload.getObjects(), s3Config );
                while ( objectsToDownload.isTruncated() ) {
                    parameters.put( MARKER_PARAMETER, getNextMarker( objectsToDownload ) );
                    requestEntity = getRequestEntity( data, resource, parameters, headers, method, endpoint, s3Config );
                    dataToReturn = new WrappedResponseEntity( client.exchange(requestEntity, ListObjectsResult.class) );
                    objectsToDownload = ((ResponseEntity<ListObjectsResult>) dataToReturn).getBody();
                    downloadObjects( downloadFolder, objectsToDownload.getBucketName(), objectsToDownload.getObjects(), s3Config );
                }
            } catch (HttpClientErrorException e) {
                if ( dataToReturn == null ) {
                    dataToReturn = new ErrorData(e); // handle and display on the other end
                }
                e.printStackTrace(System.out);
            } catch (Exception e) {
                dataToReturn = new ErrorData(e); // handle and display on the other end
                e.printStackTrace(System.out);
            }
        } else if ("listAll".equals(request.getHeader(TYPE_HEADER))) {
            RequestEntity<byte[]> requestEntity = getRequestEntity( data, resource, parameters, headers, method, endpoint, s3Config );
            RestTemplate client = new RestTemplate();
            try {
                ResponseEntity<ListObjectsResult> baseResponse = new WrappedResponseEntity( client.exchange(requestEntity, ListObjectsResult.class) );
                dataToReturn = baseResponse;
                ListObjectsResult listResult = baseResponse.getBody();
                while ( listResult.isTruncated() ) {
                    parameters.put( MARKER_PARAMETER, getNextMarker( listResult ) );
                    requestEntity = getRequestEntity( data, resource, parameters, headers, method, endpoint, s3Config );
                    ResponseEntity<ListObjectsResult> newListResponse = new WrappedResponseEntity( client.exchange(requestEntity, ListObjectsResult.class) );
                    ListObjectsResult newListResult = newListResponse.getBody();
                    listResult.setTruncated( newListResult.isTruncated() );
                    listResult.setNextMarker( getNextMarker( newListResult ) );
                    listResult.getObjects().addAll( newListResult.getObjects() );
                    listResult.getCommonPrefixes().addAll( newListResult.getCommonPrefixes() );
                }
            } catch (HttpClientErrorException e) {
                if ( dataToReturn == null ) {
                    dataToReturn = new ErrorData(e); // handle and display on the other end
                }
                e.printStackTrace(System.out);
            } catch (Exception e) {
                dataToReturn = new ErrorData(e); // handle and display on the other end
                e.printStackTrace(System.out);
            }
        } else {
            RequestEntity<byte[]> requestEntity = getRequestEntity( data, resource, parameters, headers, method, endpoint, s3Config );
    
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
                    int firstSlash = resource.indexOf(SEPARATOR, 2);
                    if (firstSlash < 0) { // no object name exists
                        responseClass = ListObjectsResult.class;
                    } else if (copySource) {
                        responseClass = SlimCopyObjectResult.class;
                    } else { // ugly hack, fix this
                        responseClass = ListBucketsResult.class;
                    }
                }
            }

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
     * @param data
     * @param resource
     * @param parameters
     * @param headers
     * @param method
     * @param endpoint
     * @param s3Config
     * @return
     * @throws Exception
     */
    private static final RequestEntity<byte[]> getRequestEntity(byte[] data, String resource, Map<String, String> parameters,
            Map<String, List<Object>> headers, HttpMethod method, String endpoint, S3Config s3Config) throws Exception {
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
        resource = endpoint + resource;

        return new RequestEntity<byte[]>(data, newHeaders, method, new URI(resource));
    }

    /**
     * @param objectList
     * @return
     */
    private static final String getNextMarker( ListObjectsResult objectList ) {
        String marker = null;

        if ( objectList.isTruncated() ) {
            marker = objectList.getNextMarker();
            if ( ( marker == null ) || marker.isEmpty() ) {
                String lastKey =  "";
                if ( ( objectList.getObjects() != null ) && ( objectList.getObjects().size() > 0 ) ) {
                    lastKey = objectList.getObjects().get( objectList.getObjects().size() - 1 ).getKey();
                }
                String lastPrefix = "";
                if ( ( objectList.getCommonPrefixes() != null ) && ( objectList.getCommonPrefixes().size() > 0 ) ) {
                    lastPrefix = objectList.getCommonPrefixes().get( objectList.getCommonPrefixes().size() - 1 );
                }
                marker = ( lastPrefix.compareTo(lastKey) > 0 ) ? lastPrefix : lastKey;
            }
    
            System.out.println( "Fetching another page after " + marker );
        }

        return marker;
    }

    /**
     * @param downloadFolder
     * @param objects
     * @param s3Config
     * @throws Exception 
     */
    private static final void downloadObjects(String downloadFolder, String bucketName, List<S3Object> objects, S3Config s3Config) throws Exception {
        File downloadBucketParent = new File( downloadFolder );
        File downloadBucket = new File( downloadBucketParent, bucketName );
        if ( !downloadBucket.exists() ) {
            if ( !downloadBucket.mkdirs() ) {
                throw new Exception( "Download location cannot be created: " + downloadBucket.getAbsolutePath() );
            }
        } else if ( !downloadBucket.isDirectory() ) {
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
            } catch ( Exception e ) {
                System.out.println( "Error downloading " + key + ": " + e.getMessage() );
            }
        }
    }

    /**
     * @param request
     * @return
     * @throws Exception
     */
    private static final S3Config getS3Config(HttpServletRequest request) throws Exception {
        String passthroughNamespace = request.getHeader(NAMESPACE_HEADER);
        String passthroughEndpoint = request.getHeader(ENDPOINT_HEADER);
        String passthroughAccessKey = request.getHeader(KEY_HEADER);
        String passthroughSecretKey = request.getHeader(SECRET_HEADER);
        while (passthroughEndpoint.endsWith(SEPARATOR)) {
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
    private static final byte[] convertToXmlAsNeeded(byte[] data, Map<String, String> parameters, Map<String, List<Object>> headers) throws Exception {
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
    private static final byte[] readBody(HttpServletRequest request) throws Exception {
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
    private static final void sign(String method, String resource, Map<String, String> parameters, Map<String, List<Object>> headers,
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
     * @param list
     * @return
     */
    private static final Boolean isNotEmpty(List list) {
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
