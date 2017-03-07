ECS API Browser
==============

[![wercker status](https://app.wercker.com/status/5ea6589e95e1aa62a999e918754fb7d8/m "wercker status")](https://app.wercker.com/project/bykey/5ea6589e95e1aa62a999e918754fb7d8)

OVERVIEW
--------------

ECS API Browser is a web application developped in Golang and leveraging AngularJS

The goals of ECS Browser are to:

- demonstrate some nice S3 features (versioning, lifecycle policy, …) and several unique ECS capabilities using either the S3, Swift or Atmos API (byte range, retentions, metadata search, …)
- simplify the usage of the S3, Swift, Atmos and ECS Management API
- provide a simple UI for the ECS metadata search features
- provide a simple UI to get metering information from ECS

BUILD
--------------

The Dockerfile can be used to create a Docker container for this web application.

Just run the following command in the folder that contains the Dockerfile: docker build -t ecs-browser .

RUN
--------------

You can optionally set environment variables (*USER*, *PASSWORD* and *ENDPOINT*) to let the application using the ECS management API to provide some additional features (like displaying the *Replication Groups* available when creating a bucket).

To start the application, run:
```
docker run -d -p 80:80 djannot/ecs-browser
```

The application is now available on port 80.

LICENSING
--------------

Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
