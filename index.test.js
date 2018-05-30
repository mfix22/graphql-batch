const { graphql } = require('graphql');
const createBatchResolver = require('.');

describe('createBatchResolver', () => {
  it('will throw an error if a function is not the first argument', () => {
    expect(() => {
      createBatchResolver();
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'undefined'.",
    );
    expect(() => {
      createBatchResolver('hello world');
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'string'.",
    );
    expect(() => {
      createBatchResolver(42);
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'number'.",
    );
    expect(() => {
      createBatchResolver({});
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'object'.",
    );
    expect(() => {
      createBatchResolver(null, () => {});
    }).toThrow(
      'Expected a function as the first argument when creating a batch ' +
        "resolver. Instead found: 'object'.",
    );
  });

  it('will batch basic synchronous resolves grouping with `fieldNodes`', () => {
    const batchResolve = jest.fn(sources =>
      sources.map(source => source + 0.5));

    const resolve = createBatchResolver(batchResolve);

    const fieldNodes1 = [{ name: { value: 'node' } }];
    const fieldNodes2 = [{ name: { value: 'node2' } }];

    return Promise.resolve()
      .then(() => {
        return resolve(0, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(0.5);
        expect(batchResolve.mock.calls.length).toEqual(1);
        return resolve(1, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(1.5);
        expect(batchResolve.mock.calls.length).toEqual(2);
        return resolve(2, null, null, { fieldNodes: fieldNodes1 });
      })
      .then(value => {
        expect(value).toEqual(2.5);
        expect(batchResolve.mock.calls.length).toEqual(3);
        return Promise.all([
          resolve(3, null, null, { fieldNodes: fieldNodes1 }),
          resolve(4, null, null, { fieldNodes: fieldNodes1 }),
          resolve(5, null, null, { fieldNodes: fieldNodes1 }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([3.5, 4.5, 5.5]);
        expect(batchResolve.mock.calls.length).toEqual(4);
        return Promise.all([
          resolve(6, null, null, { fieldNodes: fieldNodes1 }),
          resolve(7, null, null, { fieldNodes: fieldNodes2 }),
          resolve(8, null, null, { fieldNodes: fieldNodes1 }),
          resolve(9, null, null, { fieldNodes: fieldNodes1 }),
        ]);
      })
      .then(values => {
        expect(values).toEqual([6.5, 7.5, 8.5, 9.5]);
        expect(batchResolve.mock.calls.length).toEqual(6);
        expect(batchResolve.mock.calls.map(c => c[0])).toEqual([
          [0],
          [1],
          [2],
          [3,4,5],
          [6, 8, 9],
          [7]
        ])
        expect(batchResolve.mock.calls.map(c => c[3][0].fieldNodes)).toEqual([
          fieldNodes1,
          fieldNodes1,
          fieldNodes1,
          fieldNodes1,
          fieldNodes1,
          fieldNodes2,
        ])
      });
  });

  it('will handle Promise<Array> returned', async () => {
    const resolver = createBatchResolver(() => Promise.resolve([1]));
    const fieldNodes = [{ name: { value: 'node' } }];

    const res = await resolver({}, null, null, { fieldNodes })
    expect(res).toEqual(1)
  })

  it('will reject if resolver throws', async () => {
    const error = new Error('Invalid arguments')
    const resolver = createBatchResolver(() => { throw error });

    const fieldNodes = [{ name: { value: 'node' } }];

    try {
      const res = await resolver({}, null, null, { fieldNodes })
    } catch (e) {
      expect(e).toEqual(e)
    }
  })

  it('will reject if an array is not returned by the resolver', () => {
    const resolve0 = createBatchResolver(() => null);
    const resolve1 = createBatchResolver(() => 42);
    const resolve2 = createBatchResolver(() => 'Hello, world!');
    const resolve3 = createBatchResolver(() => ({}));

    const fieldNodes = [{ name: { value: 'node' } }];

    const identity = value => value;
    const unexpected = () => {
      throw new Error('Unexpected.');
    };

    return Promise.all([
        resolve0(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve2(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve3(null, null, null, { fieldNodes }).then(unexpected, identity),
      ])
      .then(errors => {
        expect(errors.map(({ message }) => message)).toEqual([
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Null]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Number]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object String]'.",
          'Must return an array of values from the batch resolver ' +
            "function. Instead the function returned a '[object Object]'.",
        ]);
      });
  });

  it('will reject if the returned value does not have the same length as the sources', () => {
      const resolve0 = createBatchResolver(() => []);
      const resolve1 = createBatchResolver(() => [1]);
      const resolve2 = createBatchResolver(() => [1, 2]);

      const fieldNodes = [{ name: { value: 'node' } }];

      const identity = value => value;
      const unexpected = () => {
        throw new Error('Unexpected.');
      };

      return Promise.all([
          resolve0(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve1(null, null, null, { fieldNodes }).then(unexpected, identity),
          resolve2(null, null, null, { fieldNodes }).then(unexpected, identity),
        ])
        .then(errors => {
          expect(errors.map(({ message }) => message)).toEqual([
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 1 value(s) but got 0 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 3 value(s) but got 1 value(s).',
            'Must return the same number of values from the batch resolver ' +
              'as there were sources. Expected 1 value(s) but got 2 value(s).',
          ]);
          expect(errors[1]).not.toBe(errors[0]);
          expect(errors[1]).toBe(errors[1]);
          expect(errors[1]).toBe(errors[2]);
          expect(errors[1]).toBe(errors[3]);
          expect(errors[1]).not.toBe(errors[4]);
        });
    },
  );

  it('will reject individual promises if errors are returned', () => {
    const error1 = new Error('Yikes 1');
    const error2 = new Error('Yikes 1');

    const resolve = createBatchResolver(() => [1, error1, 3, 4, error2]);

    const fieldNodes = [{ name: { value: 'node' } }];

    const identity = value => value;
    const unexpected = () => {
      throw new Error('Unexpected.');
    };

    return Promise.all([
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(unexpected, identity),
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(identity, unexpected),
        resolve(null, null, null, { fieldNodes }).then(unexpected, identity),
      ])
      .then(results => {
        expect(results).toEqual([1, error1, 3, 4, error2]);
        expect(results[1]).toEqual(error1);
        expect(results[4]).toEqual(error2);
      });
  });
});
