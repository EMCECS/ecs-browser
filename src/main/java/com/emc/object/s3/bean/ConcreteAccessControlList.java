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

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * @author seibed
 *
 */
public class ConcreteAccessControlList {

    private ConcreteGrantee owner;

    private Set<ConcreteGrant> grants = new LinkedHashSet<ConcreteGrant>();

    public ConcreteGrantee getOwner() {
        return owner;
    }

    public void setOwner(ConcreteGrantee owner) {
        this.owner = owner;
    }

    public Set<ConcreteGrant> getGrants() {
        return grants;
    }

    public void setGrants(Set<ConcreteGrant> grants) {
        this.grants = grants;
    }

    public AccessControlList toAccessControlList() {
        AccessControlList output = new AccessControlList();
        output.setOwner((CanonicalUser) getOwner().toAbstractGrantee());
        for (ConcreteGrant concreteGrant : getGrants()) {
            output.getGrants().add(concreteGrant.toGrant());
        }
        return output;
    }
}
