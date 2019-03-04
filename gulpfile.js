let json = require('gulp-yaml'),
    gulp = require('gulp');


gulp.task('build:aws', g => {
    return gulp.src('./aws/regions/**/*.yaml')
        .pipe(json({schema: 'DEFAULT_SAFE_SCHEMA'}))
        .pipe(gulp.dest('./aws/output/'));
});

