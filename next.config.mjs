const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
/** @type {import('next').NextConfig} */
const config = staticExport ? {output:'export',basePath,trailingSlash:true,images:{unoptimized:true}} : {};
export default config;
