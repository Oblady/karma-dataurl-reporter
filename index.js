var os = require('os');
var path = require('path');
var fs = require('fs');
var swig = require('swig');


var slug = function (input) {
    return input.toString().toLowerCase()
        .replace(/\s+/g, '')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-/g, '')         // Replace multiple - with single -
        ;
};

swig.setFilter('slugify', slug);

var KarmaDataurlReporter = function(baseReporterDecorator, config, logger, helper, formatError, emitter) {

  var log = logger.create('reporter.dataurl');
  var reporterConfig = config.dataurlReporter || {};
  var canvases = [];
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

          var match = false;
          var idx;
          for (idx=0; idx<canvases.length; idx++) {
            if(canvases[idx].id == dto.id) {
              match=true;
              break;
            }
          } 
          if(match===false) {
            canvases.push({id: dto.id, result:{}, canvases: []});
            idx = canvases.length-1;
          }

          dto.browser = browser;
          canvases[idx].canvases.push(dto);
          info = {log:'DataurlReporter:: reporting dataurl for ' + dto.id + ' (' + browser.name + ')', type:'info'};
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
      var match = false;
      var idx;
      for (idx=0; idx<canvases.length; idx++) {
        if(canvases[idx].id == result.id) {
          match=true;
          break;
        }
      } 
      if(match) {
          canvases[idx].result = result;
          canvases[idx].rootSuite = result.suite[0];
      }
    });

    var html = swig.renderFile(templateFile, {
      title: reportTitle,
      tests: canvases
    });

    canvases =[];
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
