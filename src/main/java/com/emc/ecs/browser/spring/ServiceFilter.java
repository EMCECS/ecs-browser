/**
 * Copyright 2016-2019 Dell Inc. or its subsidiaries. All rights reserved.
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
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * @author seibed
 *
 */
@Component
public class ServiceFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(ServiceFilter.class);

    private static final Set<String> securityHeaderNames = new HashSet<String>();

    private static long callNumber = 0;

    /* (non-Javadoc)
     * @see javax.servlet.Filter#doFilter(javax.servlet.ServletRequest, javax.servlet.ServletResponse, javax.servlet.FilterChain)
     */
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String logPrefix = "" + ++callNumber + ": ";
        long startTime = new Date().getTime();
        try {
            ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper((HttpServletRequest) request);
            System.err.println(logPrefix + wrappedRequest.getRequestURI());
            ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper((HttpServletResponse) response);
            logRequest(wrappedRequest, logPrefix);
            chain.doFilter(wrappedRequest, wrappedResponse);
            logResponse(wrappedResponse, logPrefix);
        } catch (Throwable t) {
            log.error(t.getMessage(), t);
            throw t;
        } finally {
            log.debug(logPrefix + "Total processing time (ms): " + (new Date().getTime() - startTime) );
        }
    }

    /**
     * @param wrappedResponse
     * @param logPrefix
     * @throws IOException
     */
    private void logResponse(ContentCachingResponseWrapper response, String logPrefix) throws IOException {
        StringBuilder stringBuilder = new StringBuilder(logPrefix);
        stringBuilder.append("Finished response of type ")
                     .append(response.getContentType())
                     .append("\nCONTENT: {\n");
//        byte[] buffer = response.getContentAsByteArray();
//        if ((buffer != null) && (buffer.length > 0)) {
//            stringBuilder.append(new String(buffer, StandardCharsets.UTF_8));
//        }
        stringBuilder.append("\n}\n status code: ");
        stringBuilder.append(response.getStatusCode())
                     .append("\n encoding: ")
                     .append(response.getCharacterEncoding())
                     .append("\n content size: ")
                     .append(response.getContentSize());
        for (String headerName : response.getHeaderNames()) {
            stringBuilder.append("\n ")
                         .append(headerName)
                         .append(": ")
                         .append(response.getHeader(headerName));
        }
        stringBuilder.append("\n");

        log.debug(stringBuilder.toString());
        response.copyBodyToResponse();
    }

    /**
     * @param request
     * @param logPrefix
     */
    private void logRequest(ContentCachingRequestWrapper request, String logPrefix) throws IOException {
        StringBuilder stringBuilder = new StringBuilder(logPrefix);
        stringBuilder.append(request.getMethod())
                     .append(" ")
                     .append(request.getScheme())
                     .append("://")
                     .append(request.getServerName())
                     .append(":")
                     .append(request.getServerPort())
                     .append(request.getServletPath())
                     .append(request.getContextPath());
        if (request.getQueryString() != null) {
            stringBuilder.append("?")
                         .append(request.getQueryString());
        }
        stringBuilder.append("\n{");
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String separator = "";
            stringBuilder.append("\n")
                         .append(headerName)
                         .append(": [");
            if (!securityHeaderNames.contains(headerName)) {
                Enumeration<String> headerValues = request.getHeaders(headerName);
                while (headerValues.hasMoreElements()) {
                    String headerValue = headerValues.nextElement();
                    stringBuilder.append("\'")
                                 .append(headerValue)
                                 .append("\'")
                                 .append(separator);
                    separator = ";";
                }
            }
            stringBuilder.append("]");
        }
        stringBuilder.append("\n} BODY: {\n");
//        try {
//            byte[] buffer = request.getContentAsByteArray();
//            if ((buffer != null) && (buffer.length > 0)) {
//                stringBuilder.append(new String(buffer, StandardCharsets.UTF_8));
//            } else {
//                stringBuilder.append("EMPTY");
//            }
//        } catch (Exception e) {
//            log.debug(logPrefix + e.getMessage(), e);
//        }
        stringBuilder.append("\n}\n");
        log.debug(stringBuilder.toString());
    }

    /* (non-Javadoc)
     * @see javax.servlet.Filter#init(javax.servlet.FilterConfig)
     */
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    /* (non-Javadoc)
     * @see javax.servlet.Filter#destroy()
     */
    @Override
    public void destroy() {}

}
