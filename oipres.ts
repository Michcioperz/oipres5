/**
 * Chainable object builder
 */
class Ayyy {
  obj: any;
  /**
   * Create a DOM object.
   * @param {string} tagname
   */
  constructor(tagname) {
    this.obj = document.createElement(tagname);
  }
  attr(key, value) {
    this.obj.setAttribute(key, value);
    return this;
  }
  html(content) {
    this.obj.innerHTML = content;
    return this;
  }
  pushFront(o) {
    this.obj.insertBefore(o, this.obj.firstChild);
    return this;
  }
  pushBack(o) {
    this.obj.appendChild(o);
    return this;
  }
  react(eventName, func) {
    this.obj.addEventListener(eventName, func, false);
    return this;
  }
}

class Code {
  filename: string;
  source: string;
}

class Test {
  name: string;
  result: string;
  time: string;
  timelimit: string;
}

class TestGroup {
  points: string;
  maxPoints: string;
  tests: Test[];
}

class Task {
  id: string;
  name: string;
  comment: string;
  result: number;
  points: number
  code: Code;
  testGroups: TestGroup[];
}

class User {
  id: number;
  name: string;
}

class Report {
  ids: number[];
  date: Date;
  user: User;
  contest: string;
  result: number;
  tasks: Task[];
}


class OiPres {
  /**
   * Check if the API exists
   * @param {any} obj That API thing
   * @param {string} name Human-readable name of the API
   * @returns {Promise} Promise resolving to that API thing
   */
  checkApi<T>(obj: T, name: string): Promise<T> {
    return new Promise((resolve, reject) => {
      if (obj) {
        resolve(obj);
      } else {
        reject(new Error(name + " is not supported in this browser."));
      }
    })
  }
  /**
   * Load the contents from a file next to all of this
   * @returns {Promise} Promise resolving to file contents
   */
  readServerFile(): Promise<string> {
    return this.checkApi(window.fetch, "Fetch API").then(fetch => fetch("/data.xml")).then(res => {
      if (res.ok) {
        return res;
      } else {
        return Promise.reject(new Error(res.statusText));
      }
    }).then(res => res.text());
  }
  /**
   * Create an upload form and load the file's contents
   * @returns {Promise} Promise resolving to file contents
   */
  readClientFile(): Promise<string> {
    return Promise.all([this.checkApi(window.File, "File API"),
      this.checkApi(window.FileReader, "FileReader API"),
      this.checkApi(window.Blob, "Blob API")]).then(([File, FileReader, Blob]) => {
        return new Promise((resolve, reject) => {
          let input = new Ayyy("input").attr("type", "file").react("change", evt => {
            let reader = new FileReader();
            reader.onload = evt => {
              resolve(evt.target.result);
            };
            reader.onerror = evt => {
              reject(evt.target.error);
            };
            reader.readAsText(evt.target.files[0]);
          }).obj;
          document.body.appendChild(input);
        });
      });
  }
  /**
   * Load the necessary data by any means necessary.
   * @returns {Promise} Promise resolving to data
   */
  loadData(): Promise<Document> {
    return new Promise((resolve, reject) => {
      this.readServerFile().then(resolve, () => { this.readClientFile().then(resolve, reject); });
    }).then(xml => {
      let parser = new DOMParser();
      return Promise.resolve(parser.parseFromString(xml, "application/xml"));
    });
  }
  /**
   * @returns {Test} reified Test
   */
  parseTest(test: Element): Test {
    let name = test.getElementsByTagName("testname")[0].textContent;
    let result = test.getElementsByTagName("testresult")[0].textContent;
    let time = test.getElementsByTagName("testtime")[0].textContent;
    let timeLimit = test.getElementsByTagName("testtimelimit")[0].textContent;
    let comment = test.getElementsByTagName("testcomment")[0].textContent;
  }
  /**
   * @returns {Task} reified Task
   */
  parseTask(task: Element): Task {
    let id = task.getElementsByTagName("taskid")[0].textContent;
    let name = task.getElementsByTagName("taskname")[0].textContent;
    let comment = task.getElementsByTagName("taskcomment")[0].textContent;
    let points = task.getElementsByTagName("taskpoints")[0].textContent;
    let result = task.getElementsByTagName("taskresult")[0].textContent;
    let code = task.getElementsByTagName("code")[0].textContent;
    let codeFile = task.getElementsByTagName("codefile")[0].textContent;
    let testGroups = [];
    let group = { points: "", maxPoints: "", tests: [] };
    for (let test of task.getElementsByTagName("test")) {
      if (test.getAttribute("newgroup") == 1 && group.tests.length > 0) {
        testGroups.push(group);
        group = { points: test.getElementsByTagName("testpoints")[0].textContent, maxPoints: test.getElementsByTagName("testmaxpoints")[0].textContent, tests: [] };
      }
      group.tests.push(this.parseTest(test));
    }
    if (group.tests.length > 0) {
      testGroups.push(group);
    }
    return { id: id, name: name, comment: comment, points: parseInt(points), result: parseInt(result), code: { source: code, filename: codeFile }, testGroups: testGroups }
  }
  /**
   * @returns {Rpt} reified Rpt
   */
  parseReport(rpt: Element): Report {
    let userno = rpt.getElementsByTagName("userno")[0].textContent;
    let reportno = rpt.getElementsByTagName("raportno")[0].textContent; // TODO: ids sometimes go NaN
    let user = rpt.getElementsByTagName("user")[0].textContent;
    let date = rpt.getElementsByTagName("date")[0].textContent;
    let contest = rpt.getElementsByTagName("contest")[0].textContent;
    let result = rpt.getElementsByTagName("result")[0].textContent;
    let tasks = [];
    for (let task of rpt.getElementsByTagName("task")) {
      tasks.push(this.parseTask(task));
    }
    return { user: { id: parseInt(userno), name: user }, ids: reportno.split(" / ").map(parseInt), date: new Date(date), contest: contest, result: parseInt(result), tasks: tasks };
  }
  /**
   * Parse the XML into object representation.
   * @returns {Promise} Promise resolving to object representation of the data from XML.
   */
  parseData(doc: Document): Promise<Report[]> {
    let rpts = doc.getElementsByTagName("rpt");
    return Promise.resolve(Array.from(rpts).map(this.parseReport.bind(this)));
  }
  present() {
    return this.loadData().then(this.parseData.bind(this));
  }
}

new OiPres().present().catch(console.error).then(console.info);
