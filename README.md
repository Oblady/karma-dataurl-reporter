# karma-dataurl-html-reporter
Karma dataurl HTML Reporter  


## Installation

  ```
  npm install --save-dev https://github.com/Oblady/karma-dataurl-reporter.git
  ```


## Configuration


In your karma configuration:

    ```
    reporters: ['progress', 'dataurl'],

    dataurlReporter: {
        outputFile: 'report/test/usag.html', // Required: path to the final report
        templateFile: __dirname+"/usagcanvasreport.tpl.html", // Optional: Path to the swig template
        reportTitle: 'USAG CANVAS', // Optional: Report Title
    }
    ```

## Usage

In your tests, send a dataurl like this:

  ```
  window.__karma__.info({log:{dataurl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', id: 'My Transparent GIF', metadata: {custom:'object'}, type: 'log'});
  ```


## Sample Template


  ```
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />

    <style type="text/css">
      img {
        border:1px solid #888;
      }

      .success  h3 {
        color:green;
      }
      .error  h3 {
        color:red;
      }
    </style>

  </head>
  <body>
  <h2>{{title}}</h2>

  {% for key, test in tests %}
    <fieldset  {% if test.result.success %} class="success" {% else %} class="error" {% endif %}><legend>{{ key }}</legend>
      <h3>{{test.result.description}}</h3>

      {% for log in test.result.log %}
        <pre>{{log}}</pre>
      {% endfor %}

      {% for canvas in test.canvases %}
        <img src="{{ canvas.dataurl }}" />

        <h4>Metadata</h4>
        <pre>
          {{canvas.metadata|json(2)}}
        </pre>
      {% endfor %}
    </fieldset>
  {% endfor %}
  </body>
  </html>
  ```
