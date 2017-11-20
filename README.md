ECS API Browser
==============

OVERVIEW
--------------

ECS API Browser is a web application developed in Java and leveraging AngularJS

The goal of the ECS Browser is to simplify the usage of the ECS S3 API, including features that aren't available in AWS S3 These include namespaces, byte range updates, and metadata search.

BUILD
--------------

To build this application, just go to the code root folder and run the command `./gradlew`.

RUN
--------------

To start the application, just go to the code root folder and run the command `java -jar build/libs/ecs-browser-<version>.jar`.

The application is then available `http://localhost:8080`.

LICENSING
--------------

Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
