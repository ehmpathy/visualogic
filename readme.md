# visualogic

![test](https://github.com/ehmpathy/visualogic/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/visualogic/workflows/publish/badge.svg)

visualize your domain.logic

# install

```sh
npm install visualogic
```

# use

### with log trail

add io log trails to your domain logic

```ts
import { withLogTrail, getResourceNameFromFileName } from 'visualogic';

const readABook = withLogTrail(async () => {
  // ...
}, {
  name: getResourceNameFromFileName(__filename),
});
```
