/*
 * grunt-assets-versioning
 * https://github.com/theasta/grunt-assets-versioning
 *
 * Copyright (c) 2013 Alexandrine Boissière
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var moment = require('moment');
var crypto = require('crypto');

module.exports = function(grunt) {

  grunt.registerMultiTask('assets_versioning', 'Static Assets revving', function() {

    var options = this.options({
      use: 'date',
      hashLength: 8,
      encoding: 'utf8',
      dateStart: false,
      dateFormat: 'YYYYMMDDHHmmss',
      outputTrimDir: '',
      rename: function(destPath, rev) {
        return path.dirname(destPath) + path.sep + path.basename(destPath, path.extname(destPath)) + '.' + rev + path.extname(destPath);
      },
      output: null,
      skipExisting: false,
      taskToRun: false,
      runTask: false
    });

    var obj = { files: [] };
    var output = [];
    this.files.forEach(function(f){

      if (f.src.length === 0) {
        grunt.log.warn('src is an empty array');
        return false;
      }

      var rev;
      if (options.use === 'date') {
        var dateStartTime = !(options.dateStart instanceof Date) ? false : +options.dateStart;
        var lastMtime = f.src.map(function(filepath){
          return +fs.statSync(filepath).mtime;
        }).sort().pop();
        var lastMTimeFormatted = moment(lastMtime).format(options.dateFormat)

        rev = (!dateStartTime || dateStartTime < lastMtime) ? lastMTimeFormatted : '';

      } else if (options.use === 'hash') {
        var hash = '';
        f.src.forEach(function(f){
          hash += crypto.createHash('md5').update(grunt.file.read(f, options.encoding)).digest('hex');
        });
        if (f.src.length > 1){
          hash = crypto.createHash('md5').update(hash).digest('hex');
        }
        rev = hash;
        if (!isNaN(options.hashLength)) {
          rev = rev.substr(0, options.hashLength);
        }
      } else {
        grunt.fail.warn('Invalid argument : options.use should be equal to date or hase');
      }

      if (rev !== '') {
        // @todo : should I check if f.dest if not null ? or should it be done from inside the rename function ?
        var destFilePath = options.rename.call(this, f.dest, rev);

        // check if file already exists
        if (options.skipExisting === true) {
          if (grunt.file.exists(destFilePath)) {
            return false;
          }
        }

        if (options.output) {
          output.push({
            rev: rev,
            dest: f.dest.replace(options.outputTrimDir, ''),
            dest_revved: destFilePath.replace(options.outputTrimDir, ''),
          });
        }

        // log the src, dest data
        obj.files.push({ src: f.src, dest: destFilePath });
      }
    });

    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(output));
    }

    grunt.config.set(this.name + '.log.'+ this.target, obj);

    if (options.taskToRun) {
      grunt.config.set(options.taskToRun + '.' + this.target, obj);
      if (options.runTask) {
        grunt.task.run(options.taskToRun + ':' + this.target);
      }
    }
  });

};

