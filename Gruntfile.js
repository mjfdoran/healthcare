var modRewrite = require('connect-modrewrite');
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

module.exports = function(grunt) {
	'use strict';

	var LIVERELOAD_PORT = 35729;

	grunt.initConfig({
		connect: {
			options: {
				livereload: LIVERELOAD_PORT
			},
			server: {
				options: {	
					middleware: function(connect, options) {
						return [
							modRewrite(['!\\.html|\\.js|\\.svg|\\.css|\\.png|\\.jpg$ /index.html [L]']),
                            mountFolder(connect, '.')
						];
					},
					port: 8080		
				}
			}
		},
		watch: {
			options: {
				livereload: LIVERELOAD_PORT
			},
			files: [
				'index.html',
				'page/*.html',
				'css/*.css',
				'js/*.js'
			]
		},
		// make a zipfile
		compress: {
			main: {
				options: {
					archive: 'dist/DemoModule.zip'
				},
				files: [
					{ src: ['css/*', 'img/*', 'js/*', 'page/*', 'fonts/*.otf', 'index.html', 'manifest.json', '!progress.json', '!.gitkeep', '!.gitignore'] }
				]
			}
		},
        uglify: { // compress all files to main.js for development
            options: {
                mangle: false
            },
            my_target: {
                files: {
                    './js/main.js': [
                        './js/jquery.js',
                        './js/angular.min.js',
                        './js/angular-route.min.js',
                        './js/angular-animate.min.js',
                        './js/angular-touch.min.js',
                        './js/app.js',
                        './js/services.js',
                        './js/controllers.js'
                    ]
                }
            }
        },
		// clean
		clean: ['dist']
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('server', [
		'connect',
		'watch'
	]);

	grunt.registerTask('default', [
		'clean',
		'compress'
	]);

    grunt.registerTask('js', [
        'uglify'
    ]);

};
