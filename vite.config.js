import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        host: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        target: 'es2020'
    },
    optimizeDeps: {
        include: ['@reown/appkit', '@reown/appkit-adapter-ethers', 'ethers']
    },
    define: {
        'process.env': {},
        global: 'globalThis'
    }
});