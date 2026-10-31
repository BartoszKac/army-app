# Archiwum Wojskowe

Static photo gallery with an admin panel, hosted on Netlify. Photos are stored in Netlify Blobs via Netlify Functions.

## Deploy

1. Push this folder to a Git repo and connect it in Netlify (or run `npx netlify-cli deploy --prod`).
   Drag-and-drop deploys do NOT build functions.
2. Netlify > Site configuration > Environment variables: set `ADMIN_HASH` to the SHA-256 of the chosen password.
   Without it, the default password is `haslo123`.

Generate a hash:

```
node -e "console.log(require('crypto').createHash('sha256').update('NEW_PASSWORD').digest('hex'))"
```

## Local

```
npm install
npx netlify-cli dev
```

Open http://localhost:8888 (gallery) and http://localhost:8888/admin.html (panel).
Until the first real photo is uploaded, the gallery shows mock images from `public/mock`.
# army-app
