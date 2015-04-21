var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('xmlbuilder');

var swig = require('swig');




var UsagReporter = function(baseReporterDecorator, config, logger, helper, formatError, emitter) {


  var log = logger.create('reporter.usag');
  var reporterConfig = config.usagReporter || {};
  var canvases = {};
  var results = [];

  var pkgName = reporterConfig.suite || '';

  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'usag-canvas-results.html'));

  var html = "";
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};
  var allMessages = [];


  baseReporterDecorator(this);


  this.adapters = [function(msg) {
    allMessages.push(msg);
  }];

  // étend la classe Browser pour attraper les dataurl avant qu’elles n’arrivent dans 
  // la sortie console !!!
  this.onBrowserStart = function(browser) {
        var baseInfo = browser.onInfo;
        browser.onInfo = function(info) {
        if(info.log.dataurl) {
          var dto = info.log;
          if(!canvases[dto.id]) {
            canvases[dto.id] = {result:{}, canvases: []};
          }
          canvases[dto.id].canvases.push(dto);
          info = {log:'CanvasReporter:: reporting dataurl for ' + dto.id + ' (' + browser.name + ')', type:'info'};
        } 
        baseInfo.call(browser, info);
      };
  };

  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
    results.push(result);
  };

  this.onRunComplete = function() {
    pendingFileWritings++;


    results.forEach(function(result) {
      if(!!canvases[result.id]) {
          canvases[result.id].result = result;
      }
    });

    var html = swig.renderFile(__dirname+"/tests/app/usagcanvasreport.html", {
      title:'USAG CANVASES',
      tests: canvases
    });

    canvases ={};
    results = [];

    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, html, function(err) {
        if (err) {
          log.warn('Cannot write UsagCanvas html\n\t' + err.message);
        } else {
          log.debug('UsagCanvas results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });
  };

  // wait for writing all the xml files, before exiting
  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

UsagReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError', 'emitter'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:usag': ['type', UsagReporter]
};
