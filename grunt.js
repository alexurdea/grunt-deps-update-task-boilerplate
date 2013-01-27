var path = require('path'),
    child_process = require('child_process');

/*global module:false*/
module.exports = function(grunt) {
  var self = this,
      initialDir = process.cwd();

  var LIB = 'js/lib';

  // commands to handle updates
  var updateFn = {
    
    /**
     * IMPORTANT: These functions must be bound to the task, in order to 
     * be able to access the async function, in case they need it!
     * 
     * @param {string} options.dir
     * @param {string} options.buildCmd
     */
    'git': function(options){
        process.chdir(options.dir);
        execWithOutput("git pull origin master");
        done = this.async();
        options.buildCmd && execWithOutput(options.buildCmd, done);
      },
    
    /**
     * @param {string} options.packageName
     */
    'bower': function(options){
        process.cwd(initialDir);
        execWithOutput("bower update " + options.packageName);
      }
  };

  // paths are relative to current dir
  var depsToUpdate = {
    'bacon': {
      from: __dirname + '/components/bacon/lib/Bacon.js',
      to: __dirname + '/' + LIB + '/bacon.js',
      type: 'bower'
    },
    'backbone': {
      from: __dirname + '/repos/backbone/backbone.js',
      to: __dirname + '/' + LIB + '/backbone.js',
      buildCmd: 'git log -2',
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

  // revert, useful when testing the update task
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
  function execWithOutput(cmd, done){
    child_process.exec(cmd, function (error, stdout, stderr){
      grunt.log.writeln('stdout: ' + formatExecOutpuTitle(stdout));
      grunt.log.writeln('stderr: ' + formatExecOutpuTitle(stderr));
      if (error !== null){
        grunt.log.writeln('exec error: ' +  + error);
      }
      done(error);
    });
  }

  /**
   * @param {string} text
   */
  function formatExecOutpuTitle(text){
    return '\n#############################\n' + text + '\n';
  }
};