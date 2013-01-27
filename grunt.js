var path = require('path'),
    child_process = require('child_process');

module.exports = function(grunt) {
  var self = this,
      initialDir = process.cwd();

  var LIB = 'js/lib';

  // Functions to handle updates
  var updateFn = {
    
    /**
     * IMPORTANT: These functions must be bound to the task, in order to 
     * be able to access the async function, in case they need it!
     * 
     * @param {string} options.dir
     * @param {string} options.buildCmd
     */
    'git': function(options){
        var done = this.async();
        
        process.chdir(options.dir);
        grunt.task.helper('exec-with-output', 'git pull origin master');
        options.buildCmd && grunt.task.helper('exec-with-output', options.buildCmd, done);
      },
    
    /**
     * @param {string} options.packageName
     */
    'bower': function(options){
        process.cwd(initialDir);
        grunt.task.helper('exec-with-output', "bower update " + options.packageName);
      }
  };

  // Paths are relative to current dir
  var depsToUpdate = {
    'bacon': {
      from: __dirname + '/components/bacon/lib/Bacon.js',
      to: __dirname + '/' + LIB + '/bacon.js',
      type: 'bower'
    },
    'backbone': {
      from: __dirname + '/repos/backbone/backbone-min.js',
      to: __dirname + '/' + LIB + '/backbone-min.js',
      buildCmd: 'rake build',
      type: 'git'
    }
  };

  // Project configuration.
  grunt.initConfig({
    lint: {
      files: ['grunt.js', 'lib/**/*.js', 'test/**/*.js']
    },
    qunit: {
      files: ['test/**/*.html']
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint qunit'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        jQuery: true
      }
    }
  });

  // Default task.
  grunt.registerTask('default', 'lint qunit');

  grunt.registerTask('update', 'copy the latest versions of dependency files', function(){
    var depProps;

    for (dep in depsToUpdate){
      depProps = depsToUpdate[dep];

      updateFn[depProps.type].bind(this)({
        dir: path.dirname(depProps.from),
        packageName: dep,
        buildCmd: depProps.buildCmd
      });
      grunt.file.copy(depProps.from, depProps.to);
    }

    process.chdir(path.dirname(initialDir));
  });

  // Revert - useful when testing the update task
  grunt.registerTask('revert-update', function(){
    var depProps;

    for (dep in depsToUpdate){
      depProps = depsToUpdate[dep];

      // delete all updated files
      child_process.exec('rm ' + depsToUpdate[dep].to);

      // revert all git repos
      if (depProps.type == 'git'){
        process.chdir(path.dirname(depProps.from));
        child_process.exec('git reset --hard HEAD~3');
      }
    }
  });

  /**
   * @param {string} cmd
   */
  grunt.task.registerHelper('exec-with-output', function(cmd, done){
    child_process.exec(cmd, function (error, stdout, stderr){
      grunt.log.writeln(formatExecOutpuTitle(cmd, 'stdout', stdout));
      grunt.log.writeln(formatExecOutpuTitle(cmd, 'stderr', stderr));
      if (error !== null){
        grunt.log.writeln(formatExecOutpuTitle(cmd, 'exec error', error));
      }
      done && done(error);
    });

    /**
     * @param {string} cmd
     * @param {string} bufferName
     * @param {string} text
     */
    function formatExecOutpuTitle(cmd, bufferName, text){
      return '`' + cmd + '` => ' + bufferName 
        + ':\n############################################\n' + (text.length ? text : '-') + '\n';
    }
  });
};