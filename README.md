# Read YAML Github action

This action reads a .yaml file, and sets one output for every key it has. These outputs can be used in later steps, which allows a yaml file to function as a configuration file within a Github workflow.

Furthermore it supports variables interpolation, using the `$(var)` syntax. This allows for complex dependencies and relationship between keys, enabling great flexibility when creating the yaml file. For more information, check the example below.

## Example usage

An example is provided in the [examples](examples) folder, containing a config file called [config_example.yaml](examples/config_example.yaml) and a Github action called [read_yaml.yaml](examples/read_yaml.yaml).

The config file contains the following keys:

> ```yaml
> namespace: namespace_example
> location: location_example
> environment: dev
>
> resource_group_name: $(namespace)-$(location)-$(environment) # this will be replaced with the variables above
> ```

Note that the key `resource_group_name` uses variable interpolation. The key value will resolve to: `namespace_example-location_example-dev`.

The action reads the yaml file as following:

> ```yaml
> name: helpers-read-yaml
>
> on:
>   push:
>   workflow_dispatch:
>
> jobs:
>   read-yaml:
>     runs-on: ubuntu-latest
>     steps:
>       - name: checkout
>         uses: actions/checkout@v3
>
>       - name: read-yaml-file
>         uses: pietrobolcato/action-read-yaml@1.0.0
>         id: read_action_js
>         with:
>           config: ${{ github.workspace }}/examples/config_example.yaml
>
>       - name: use-yaml-file
>         run: |
>           echo namespace: ${{ steps.read_action_js.outputs.namespace }}
>           echo location: ${{ steps.read_action_js.outputs.location }}
>           echo environment: ${{ steps.read_action_js.outputs.environment }}
>           echo resource_group_name: ${{ steps.read_action_js.outputs.resource_group_name }}
> ```

And outputs:

> ```bash
> namespace: namespace_example
> location: location_example
> environment: dev
> resource_group_name: namespace_example-location_example-dev
> ```
