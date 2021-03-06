/**
 * Copyright 2018-2019 Dell Inc. or its subsidiaries. All rights reserved.
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
package com.emc.object.s3.bean;

/**
 * @author seibed
 *
 */
public class ConcreteGrant {

    private ConcreteGrantee grantee;
    private Permission permission;

    public ConcreteGrantee getGrantee() {
        return grantee;
    }

    public void setGrantee(ConcreteGrantee grantee) {
        this.grantee = grantee;
    }

    public Permission getPermission() {
        return permission;
    }

    public void setPermission(Permission permission) {
        this.permission = permission;
    }

    public Grant toGrant() {
        Grant output = new Grant();
        output.setPermission(getPermission());
        output.setGrantee(getGrantee().toAbstractGrantee());
        return output;
    }
}
