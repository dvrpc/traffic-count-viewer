// @WEBPACK: disable grunt
// module.exports = function(grunt){
// 	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

//     grunt.initConfig({
//         pkg: grunt.file.readJSON('package.json'),

       
// 		uglify: {
// 		    vendor: {
// 		    	options: {
// 		    		sourceMap: true
// 		    	},
// 		    	files: {
// 		    		'dist/lib/js/vendor.min.js': [
// 		    			'lib/js/vendor/jquery.nouislider.min.js',
// 		    			'lib/js/vendor/typeahead.bundle.js',
// 		    			'lib/js/vendor/numeral.min.js',
// 		    			'lib/js/vendor/leaflet.label.js'
// 		    		]
// 		    	}
// 		    },
// 		    app: {
// 		        options: {
// 		    		sourceMap: true
// 		    	},
// 		    	files: {
// 		    		'dist/lib/js/map.min.js': [
// 		    			'lib/js/dvrpc.draw.js',
// 		    			'lib/js/map.js'
// 		    		]
// 		    	}
// 		    }
// 		},

// 		postcss: {
// 		  options: {
// 		    map: true,
// 		    processors: [
// 		      require('autoprefixer')({browsers: ['> 1% in US', 'last 3 versions', 'IE >= 8']})
// 		    ]
// 		  },
// 	   		build: {
// 		    	expand: true,
// 		    	cwd: 'lib/css/',
// 		    	src: [ '**/*.css' ],
// 		    	dest: 'build'
// 		 	}
// 		},


// 		cssmin: {
// 		   dist: {
// 		   		options: {
//     				sourceMap: true,
//     			},
// 			    files: {
// 			         'dist/lib/css/style.min.css': [
// 			         	'build/style.css'
// 			         ]
// 			    }
// 		  }
// 		},

// 		clean: {
// 			css: ['build']
// 		},

// 		copy: {
				
// 				images:{
// 					expand: true,
// 					cwd: 'lib/images/enhanced/',
// 					dest: './dist/lib/images/',
// 					src: ['**']
// 				},
// 				files:{
// 					expand: true,
// 					cwd: 'lib/files/',
// 					dest: './dist/lib/files/',
// 					src: ['**']
// 				},
// 				index: {
// 					src: ['index.htm'],
// 					dest: './dist/'
// 				}	
// 		},

// 		convert: {
// 		    options: {
// 		      explicitArray: false,
// 		    },
// 		    csv2json: {
// 		      src: ['data/search_locations.csv'],
// 		      dest: 'dist/data/search_locations.json'
// 		    }
// 		},

// 		// jshint: {
// 		// 	options: {
// 	 //            reporter: require('jshint-stylish')
// 	 //        },
// 		// 	tools : ['lib/tools/*.js']
// 		// },

// 		watch: {
// 			js: {
//       			files: ['lib/js/*.js'],
//       			tasks: ['uglify:app']
//       		},
//       		css: {
//       			files: ['lib/css/*.css'],
//       			tasks: ['postcss', 'cssmin', 'clean']
//       		},
//       		html: {
//       			files: ['*.htm'],
//       			tasks: ['copy:index']
//       		}
// 		},

// 		imagemin:{
// 			png:{
// 				options:{
// 					optimizationLevel: 7
// 				},
// 				files: [
// 					{
// 						expand: true,
// 						cwd: 'lib/images/',
// 						src: ['*.png'],
// 						dest: 'lib/images/enhanced/',
// 						ext: '.png'
// 					}
// 				]
// 			},
// 			jpeg:{
// 				options:{
// 					progressive:true
// 				},
// 				files:[
// 					{
// 						expand: true,
// 						cwd: 'lib/images/',
// 						src: ['*.jpg'],
// 						dest: 'lib/images/enhanced/',
// 						ext: '.jpg'	
// 					}
// 				]
// 			},
// 			gif:{
// 				options:{
// 					interlaced:true
// 				},
// 				files:[
// 					{
// 						expand: true,
// 						cwd: 'lib/images/',
// 						src: ['*.gif'],
// 						dest: 'lib/images/enhanced/',
// 						ext: '.gif'	
// 					}
// 				]
// 			}
// 		}
//     });

//     grunt.registerTask('default', ['uglify', 'postcss', 'cssmin', 'clean', 'copy', 'convert']);
// };