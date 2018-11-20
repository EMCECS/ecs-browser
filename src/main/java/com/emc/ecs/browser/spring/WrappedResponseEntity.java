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

import org.springframework.http.ResponseEntity;

/**
 * @author seibed
 *
 */
public class WrappedResponseEntity<T> extends ResponseEntity<T> {

    private final int status;

    private final String statusText;

    /**
     * @param bareResponseEntity
     */
    public WrappedResponseEntity(ResponseEntity<T> bareResponseEntity) {
        super(bareResponseEntity.getBody(), bareResponseEntity.getHeaders(), bareResponseEntity.getStatusCode());
        status = getStatusCode().value();
        statusText = getStatusCode().getReasonPhrase();
    }

    public final int getStatus() {
        return status;
    }

    public final String getStatusText() {
        return statusText;
    }

}
