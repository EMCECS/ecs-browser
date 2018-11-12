#
#  Copyright (c) 2018 EMC Corporation. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License").
# You may not use this file except in compliance with the License.
# A copy of the License is located at
#
# http://www.apache.org/licenses/LICENSE-2.0.txt
#
# or in the "license" file accompanying this file. This file is distributed
# on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
# express or implied. See the License for the specific language governing
# permissions and limitations under the License.
#

FROM openjdk:8

EXPOSE 8080

WORKDIR /usr/src/app
COPY build/libs/ecs-browser-1.0.0rc2.jar ./

CMD [ "java", "-jar", "ecs-browser-1.0.0rc2.jar" ]
