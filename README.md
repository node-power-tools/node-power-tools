# Node Power Tools

---

<pre>
      __   __   ___     __   __        ___  __     ___  __   __        __  
|\ | /  \ |  \ |__     |__) /  \ |  | |__  |__)     |  /  \ /  \ |    /__`
| \| \__/ |__/ |___    |    \__/ |/\| |___ |  \     |  \__/ \__/ |___ .__/                                                                                                                                                                                                                                                                                                         

                            ,▄▄╦╓╓╔╦╦╦╓▄▄╦▄╦╓
  ,,╔-,╓ ,,        ▄▓▓▓▓▓▓▓▓▓▓▓▌░░╠░╬░╠░░▀▀░░░░░╣╬╬╦╬▒╦
       '  "'^╙`"""▀▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░╬╬╬╬▒
                   `▀╬╬▀▀▀▓▓▓▓▓░░░░░░▌▌▓▓▓▓▓▓▓▓Å#╢╫╬╬╬╬╬Γ
                           ╙▀▒╬░'''░░▌▌▀▓▓▓▓▓▓▓░▀╬░░░╬╬#
                                ≈░░.  ╫╫▄░╠▄╠╠╠ƒ╙░░░░╦ε
                                    ▐▓Q░░░▐▒▓▓▓▌
                                     ▀▀░░░░▓▓▓▓▓▄
                                         '░╟▓▓▓▓▓⌐
                                         ╘▒▓╬▓▓▓▓▓
                                          ╫╬╬╬▓▓▓▓⌐
                                        ;░║▓╬╬▓▓▓▓▌
                                      ░░░░░░░░▀▀▀░░╦
                                     å░░░░░░░░░╬╬╬╬░░╠
                                     ░╠░░░░░░░╬░░░╠▒╬
                                     ╠▀▓▓▀▒▄,░╟╣█▓▓▌⌐
                                     ▐╬╬╬╬╬▓▓▓▓▓▓▓▓╬
                                      `╙▀▀▀▀▒▒▓▓▓▀▀
</pre>

Tools to make your life as a NodeJS developer a little better.

## Useful commands

> Note: If you have _Nx_ installed globally, you can omit _yarn_ from the following commands.

### Build

Run `yarn nx build <NPT_MODULE_NAME>`The build artifacts will be stored in the `dist/` directory.

To build all projects, run `yarn nx run-many --target=build --all`

### Running unit tests

Run `yarn nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `yarn nx affected:test` to execute the unit tests affected by a change.

Run `yarn nx run-many --target=test --all` to execute unit tests for all modules.

### Generate a new library

Run `yarn nx generate @nrwl/node:library SUPER_COOL_LIB --buildable --publishable` to generate a new publishable NodeJS
library.

### Dependency graph

Run `yarn nx dep-graph` to see a diagram of the dependencies of your projects.
