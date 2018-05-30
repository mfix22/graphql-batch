# GraphQL Batch

This library is an alternative to batching with [`dataloader`][] that works with both [`graphql`][] and [`graphql-tools`][].

**Note**: this is a fork of [`graphql-resolve-batch`](https://github.com/calebmer/graphql-resolve-batch), except we give users finer-grained control of their batching.

[`dataloader`]: https://github.com/facebook/dataloader

```js
import { GraphQLObjectType, GraphQLString } from 'graphql'
import createBatchResolver from 'graphql-batch'

const UserType = new GraphQLObjectType({
  // ...
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      resolve: createBatchResolver(async (sources, args, [context]) => {
        const { db } = context
        const users = await db.loadUsersByIds(sources.map(({ id }) => id))
        return users
      })
    }
  }
})
```

[`graphql`]: https://github.com/graphql/graphql-js
[`graphql-tools`]: https://github.com/apollographql/graphql-tools

## Usage
Install `graphql-batch` with
```sh
$ npm install --save graphql-batch graphql
```
or
```sh
$ yarn add graphql-batch graphql
```

and import it as
```js
import createBatchResolver from 'graphql-batch';
```

### Examples

1) This example batches up requests to `node` into a single request to `nodes`
```js

const resolve = createBatchResolver(
  (roots, argss, [context], [info]) =>  
    queries['nodes']({}, { ids: argss.map(args => args && args.id) }, context, info),
  // batch by request id and root field name
  (parent, args, context, info) =>
    `${context.req && context.req.id}${info.fieldNodes[0].name.value}`)
)

return {
  Query: {
    node: {
      resolve
    }
  }
}
```

**Note**: the second parameter is optional and will default to use the first `fieldName` as the key:
```js
function defaultCompositeKey(parent, args, context, info) {
  return info.fieldNodes[0].name.value
}
```


## Credits

* This is a fork of [`graphql-resolve-batch`](https://github.com/calebmer/graphql-resolve-batch) by [`@calebmer`](https://github.com/calebmer)
