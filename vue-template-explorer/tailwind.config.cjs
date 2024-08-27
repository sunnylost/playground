/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            spacing: {
                1: '1px',
                2: '2px',
                4: '4px',
            }
        }
    },
    plugins: []
}
