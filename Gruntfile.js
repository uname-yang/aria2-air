module.exports = function(grunt) {
  // Load tasks provided by each plugin
  grunt.loadNpmTasks("grunt-contrib-stylus");
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Project configuration
  grunt.initConfig({
    browserify: {
      dist: {
        options: {
          transform: [['babelify', {presets: ['es2015','react']}]]
        },
        src: 'render/js/app.js',
        dest: 'build/bundle.js'
      }
    },

    stylus: {
      build: {
        src: "render/styles/app.styl",
        dest: "build/css/app.css"
      }
    },

    watch: {
      styles: {
        files: "render/styles/app.styl",
        tasks: "stylus"
      },

    script: {
        files: ["render/app.js", "render/**/*.js","main/*.js"],
        tasks: "browserify"
      }
    },

    copy: {
      main: {
        files: [{
          expand: true,
          cwd: 'node_modules/font-awesome/css/',
          src: '**',
          dest: 'build/css/'
        },{
          expand: true,
          cwd: 'render/static/',
          src: ['**'],
          dest: 'build/'
        }]
      }
    },

    clean: {
      files: ['build/']
    }
  });

  grunt.registerTask('build', function() {
    grunt.file.mkdir('build/js');
    //grunt.file.mkdir('build/fonts');
    grunt.file.mkdir('build/css');
    //grunt.task.run(['copy','browserify']);
    grunt.task.run(['stylus', 'copy','browserify']);
  });

  grunt.registerTask('default', ['build', 'watch']);
};
