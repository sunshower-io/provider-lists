let json = require('gulp-yaml'),
    shell = require('gulp-shell'),
    gulp = require('gulp'),
    azureCatalogExtractor = require('./azure/catalog-extractor.js'),
    azureRegionExtractor = require('./azure/region-extractor.js');


gulp.task('build:aws', g => {
    return gulp.src('./aws/regions/**/*.yaml')
        .pipe(json({schema: 'DEFAULT_SAFE_SCHEMA'}))
        .pipe(gulp.dest('./aws/output/'));
});


gulp.task('build', gulp.series('build:aws'), buildAzure);

function buildAzure() {
    azureRegionExtractor();
    azureCatalogExtractor();

}

