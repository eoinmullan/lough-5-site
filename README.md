## Lough 5 website

Website for the annual Lough 5 Road Race & walk.

Build with: `gulp build`

Push the site to an s3 bucket with:

`aws s3 sync dist/ s3://bucket-name/ --acl public-read --cache-control max-age=3600 --delete`