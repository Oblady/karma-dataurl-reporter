var os = require('os');
var path = require('path');
var fs = require('fs');
var swig = require('swig');


var KarmaDataurlReporter = function(baseReporterDecorator, config, logger, helper, formatError, emitter) {

  var reporterConfig = config.dataurlReporter || {};
  var canvases = {};
  var results = [];

  var pkgName = reporterConfig.suite || '';

  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'dataurl-results.html'));

  var templateFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.templateFile
      || __dirname+"/defaulttemplatereport.html"));

  var reportTitle = reporterConfig.reportTitle || 'CANVASES';

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

    var html = swig.renderFile(templateFile, {
      title: reportTitle,
      tests: canvases
    });

    canvases ={};
    results = [];

    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, html, function(err) {
        if (err) {
          log.warn('Cannot write HTML\n\t' + err.message);
        } else {
          log.debug('Dataurls written to "%s".', outputFile);
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

KarmaDataurlReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError', 'emitter'];

module.exports = {
  'reporter:dataurl': ['type', KarmaDataurlReporter]
};
