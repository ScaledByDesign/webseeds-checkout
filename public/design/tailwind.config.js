/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./*.html",        // root HTML pages
        "./assets/**/*.html",
        "./assets/**/*.js",
        "./src/**/*.{js,ts}"
    ],
    theme: { extend: {} },
    plugins: [],
}
