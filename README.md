## Lough 5 website

Website for the annual Lough 5 Road Race & walk.

Bring down dependencies with `npm install` & `bower install`

For development, run the site locally with `gulp serve`. This will bring the site up at http://localhost:3000/. Changes will be reflected as soon as they are saved using BrowserSync.

To run the full build with minification: `gulp build`

Push the site to an s3 bucket with:

`aws s3 sync dist/ s3://bucket-name/ --acl public-read --cache-control max-age=3600 --delete`