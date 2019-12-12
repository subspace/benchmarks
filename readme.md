A simple script that benchmarks AES-256-CBC encoding and decoding performance for 128 to 2048 rounds, in 128 round increments.

```
git clone https://github.com/subspace/benchmarks.git
cd benchmarks
npm install
```

## Test Encoding

`npx ts-node src/index.ts`

CSV files will be written to `/results` folder.

## Test Plotting

`npx ts-node src/plotter.ts`

Time will be output the console.