const transformer = require('@nestjs/swagger/plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          getCustomTransformers: (program) => ({
            before: [
              transformer.before(
                {
                  classValidatorShim: true,
                  introspectComments: true,
                  dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
                },
                program,
              ),
            ],
          }),
        },
      },
    ],
  },
};
