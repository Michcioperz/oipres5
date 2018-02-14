/**
 * Chainable object builder
 */
class Ayyy {
  obj: Element;
  
  
  /**
   * Create a DOM object.
   * @param {string} tagname
   */
  constructor(tagname: string) {
    this.obj = document.createElement(tagname);
  }

  attr(key: string, value: any): Ayyy {
    this.obj.setAttribute(key, value);
    return this;
  }

  html(content: string): Ayyy {
    this.obj.innerHTML = content;
    return this;
  }

  text(content: string): Ayyy {
    this.obj.textContent = content;
    return this;
  }

  pushFront(o: Ayyy): Ayyy {
    this.obj.insertBefore(o.obj, this.obj.firstChild);
    return this;
  }

  pushFrontE(o: Element): Ayyy {
    this.obj.insertBefore(o, this.obj.firstChild);
    return this;
  }

  pushBack(o: Ayyy): Ayyy {
    this.obj.appendChild(o.obj);
    return this;
  }

  pushBackE(o: Element): Ayyy {
    this.obj.appendChild(o);
    return this;
  }

  pushBackAll(l: Ayyy[]): Ayyy {
    for (let o of l) {
      this.pushBack(o);
    }
    return this;
  }

  pushBackAllE(l: Element[]): Ayyy {
    for (let o of l) {
      this.pushBackE(o);
    }
    return this;
  }

  react(eventName, func): Ayyy {
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
  comment: string;
  result: string;
  time: string;
  timeLimit: string;
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

const enum TestResult {
  JDW = 0, // Just Do Whatever
  AC = 1, // ACcepted
  WA = 2, // Wrong Answer
  TLE = 3, // Time Limit Exceeded
  RE = 5, // Runtime Error
  SV = 6, // Security Violation
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
    let comment = test.getElementsByTagName("testcomment")[0].textContent;
    let textResult = test.getElementsByTagName("testresult")[0].textContent;
    switch (parseInt(textResult)) {
      case TestResult.TLE:
        textResult = "Przekroczenie limitu czasu";
        break;
      case TestResult.AC:
        textResult = "OK";
        break;
      case TestResult.RE:
        textResult = "Błąd wykonania";
        break;
      case TestResult.SV:
        textResult = "Naruszenie zasad";
        break;
      case TestResult.WA:
        textResult = "Zła odpowiedź"
        break;
      case TestResult.JDW:
      default:
        textResult = comment;
    }
    let time = test.getElementsByTagName("testtime")[0].textContent;
    let timeLimit = test.getElementsByTagName("testtimelimit")[0].textContent;
    return { name: name, result: textResult, time: time, timeLimit: timeLimit, comment: comment };
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
      if (test.getAttribute("newgroup") == 1) {
        if (group.tests.length > 0) {
          testGroups.push(group);
        }
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

  printTest(test: Test): Ayyy {
    return new Ayyy("tr").pushBackAll([
      new Ayyy("td").text(test.name),
      new Ayyy("td").text(test.result),
      new Ayyy("td").text(test.time + "/" + test.timeLimit)
    ]);
  }

  printTestGroup(group: TestGroup): Ayyy {
    return new Ayyy("tr").pushBack(
      new Ayyy("td").pushBack(
        new Ayyy("table").pushBack(
          new Ayyy("tr").pushBackAll([
            new Ayyy("td").pushBack(
              new Ayyy("table").pushBackAll(group.tests.map(this.printTest.bind(this)))
            ),
            new Ayyy("td").text("" + group.points + "/" + group.maxPoints)
          ])
        )
      )
    );
  }

  printTask(task: Task): Ayyy[] {
    // TODO: comment extraction
    return [
      new Ayyy("div").pushBack(new Ayyy("h2").text(task.name + "(" + task.id + ")")).pushBackAll(task.testGroups.map(this.printTestGroup.bind(this))).pushBack(new Ayyy("h2").text(task.result + "/" + task.points))
    ];
  }

  printReport(report: Report): Ayyy {
    let header = new Ayyy("h1").text(report.user.name).obj;
    let section = new Ayyy("section").pushBackAll([].concat.apply([], report.tasks.map(this.printTask.bind(this))));
    for (let page of section.obj.children) {
      page.insertBefore(header.cloneNode(true), page.firstChild);
    }
    return section;
  }

  printData(data: Report[]): Promise<Element> {
    return new Promise((resolve, reject) => {
      resolve(new Ayyy("main").pushBackAll(data.map(this.printReport.bind(this))).obj);
    });
  }

  present(): Promise {
    return this.loadData().then(this.parseData.bind(this)).then(this.printData.bind(this));
  }
}

new OiPres().present().catch(console.error).then(document.body.appendChild.bind(document.body));
