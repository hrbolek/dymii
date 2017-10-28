html = function () {
        var self = this;
        self.rtfUnicode = function (s) {
            /*
            */
            return s;
            
            
            if (s == null)
                s = '';
            else if (typeof s !== "string")
                s = String(s);
            return s.replace(/.{1}/g, function (c) {
                var cn = c.charCodeAt(0);
                if (cn > 127)
                    return '\\u' + c.charCodeAt(0) + 'G'; //kazdy "non ASCII" znak prevest na decimalni cislo
                return c;
            });
        };
        self.parseRtf = function (rtfinput, jsonData, classid, filledid, classname, filledname) {
            var cmdObj = function (type, parameter, rtfText, parent) {
                var selfRtf = this;
                this.type = type;
                this.parameter = parameter;
                this.rtfText = rtfText;
                this.parent = parent;
                this.children = [];
                this.prefixCache = null;
                this.prevIndex = null;
                this.dataExists = null;
                this.prefix = function (index) {
                    if (selfRtf.prefixCache == null || index != selfRtf.prevIndex) {
                        selfRtf.prevIndex = index;
                        if (selfRtf.parent != null) {
                            var parentPrefix = selfRtf.parent.prefix(selfRtf.parent.prevIndex);
                            selfRtf.prefixCache = (parentPrefix != null ? parentPrefix + (index != null ? '.' + index : '') + '.' : '') + selfRtf.parameter;
                        }
                    }
                    return selfRtf.prefixCache;
                };
                //generovani rtf na zaklade rozparsovanych prikazu
                this.genRtf = function (index) {
                    var prefix = selfRtf.prefix(index);
                    selfRtf.dataExists = prefix in items;
                    var value = selfRtf.dataExists ? items[prefix] : '';
                    var rtf = (selfRtf.parent == null ? '' : selfRtf.rtfText + self.rtfUnicode(value));
                    //zpracovani prikazu
                    switch (selfRtf.type) {
                        case 'F':
                            selfRtf.dataExists = false;
                            var continueLoop = true;
                            var loopRtf = '';
                            //kdyz prefix je v datove strukture
                            if (prefix in dataStructure) {
                                for (var i = 0; prefix in dataStructure && continueLoop; i++) {
                                    rtf += loopRtf;
                                    loopRtf = '';
                                    continueLoop = false;
                                    for (var y = 0; y < selfRtf.children.length; y++) {
                                        var ch = selfRtf.children[y];
                                        loopRtf += ch.genRtf(i);
                                        if (ch.dataExists) {
                                            continueLoop = true;
                                            selfRtf.dataExists = true; //porad je co vypisovat (hlavne kvuli osetreni zanoreni smycek)
                                        }
                                    }
                                }
                            }
                            break;
                        //W je stejne jako default
                        case 'W':
                            //kdyz prefix neni v datove strukture, preskocit default
                            if (!(prefix in dataStructure))
                                break;
                        default:
                            for (var i = 0; i < selfRtf.children.length; i++) {
                                rtf += selfRtf.children[i].genRtf();
                            }
                            break;
                        case 'CLASSID':
                            rtf += classid;
                            break;
                        case 'FILLEDID':
                            rtf += filledid;
                            break;
                        case 'CLASSNAME':
                            rtf += self.rtfUnicode(classname);
                            break;
                        case 'FILLEDNAME':
                            rtf += self.rtfUnicode(filledname);
                            break;
                    }
                    return rtf;
                };
            };
            function nearestNode(obj) {
                while (true) {
                    if (obj == null)
                        return null;
                    if (obj.type == 'F' || obj.type == 'W' || obj.type == null)
                        return obj;
                    obj = obj.parent;
                }
            }
            function pushCmd() {
                var parent = nearestNode(currCmd);
                var newCmd = new cmdObj(command, parName, preRtf, parent);
                if (parent != null)
                    parent.children.push(newCmd);
                currCmd = newCmd;
                if (currCmd.type == 'E') {
                    if (currCmd.parent != null && currCmd.parent.parent != null)
                        currCmd = nearestNode(currCmd.parent.parent);
                    else
                        currCmd = currCmd.parent;
                }
                preRtf = '';
            }
            function checkBlockEnding(obj) {
                switch (obj.type) {
                    case 'F':
                    case 'W':
                        var isE = false;
                        for (var i = 0; i < obj.children.length; i++) {
                            if (obj.children[i].type == 'E') {
                                isE = true;
                                break;
                            }
                        }
                        if (!isE)
                            return false;
                    //u null == root nekontrolovat E
                    case null:
                        //zkontrolovat i potomky
                        for (var i = 0; i < obj.children.length; i++) {
                            if (!checkBlockEnding(obj.children[i]))
                                return false;
                        }
                        break;
                }
                return true;
            }
            var tSc1 = 0, tSc2 = 1, tPar = 2, tEc1 = 3, tEc2 = 4, tCmd = 5, tNone = 6, tInit = 7;
            var endPos = rtfinput.length;
            var preRtf = '';
            var rtfString = '';
            var command = '';
            var parName = '';
            var currT = tInit;
            var currCmd = new cmdObj(null, null, '', null);
            var rootCmd = currCmd;
            var items = [];
            var dataStructure = [];
            //roztridit polozky do pole podle nazvu id (Name)
            for (var i in jsonData) {
                items[i] = jsonData[i];
                //rozdrobit podle tecek
                var splitArr = i.split('.');
                var merged = '';
                for (var y = 0; y < splitArr.length; y++) {
                    merged += splitArr[y] + '.';
                    dataStructure[merged.slice(0, -1)] = true;
                }
            }
            //samotne parsovani
            for (var pos = 0; pos < endPos; pos++) {
                var currChar = rtfinput[pos];
                switch (currT) {
                    case tNone:
                        //neni to co hledame => zapsat na vystup
                        preRtf += rtfString;
                    //tady break neni schvalne
                    case tInit:
                        rtfString = '';
                        parName = '';
                        switch (currChar) {
                            case '[':
                                currT = tSc1;
                                break;
                            default:
                                currT = tNone;
                        }
                        break;
                    case tSc1:
                        switch (currChar) {
                            case '[':
                                currT = tSc2;
                                break;
                            default:
                                currT = tNone;
                                break;
                        }
                        break;
                    case tSc2:
                        command = currChar;
                        currT = tCmd;
                        break;
                    case tCmd:
                        if ((currChar >= 'A' && currChar <= 'Z'))
                            command += currChar;
                        else {
                            switch (currChar) {
                                case ':':
                                    currT = tPar;
                                    break;
                                case ']':
                                    currT = tEc1;
                                    break;
                                default:
                                    currT = tNone;
                                    break;
                            }
                        }
                        break;
                    case tEc1:
                        switch (currChar) {
                            case ']':
                                currT = tInit;
                                //ulozit dany prikaz
                                switch (command) {
                                    case 'F':
                                    case 'W':
                                    case 'I':
                                    case 'E':
                                    case 'CLASSID':
                                    case 'FILLEDID':
                                    case 'CLASSNAME':
                                    case 'FILLEDNAME':
                                        pushCmd();
                                        break;
                                    default:
                                        currT = tNone;
                                        break;
                                }
                                break;
                            default:
                                currT = tNone;
                                break;
                        }
                        break;
                    case tPar:
                        if ((currChar >= 'a' && currChar <= 'z') || currChar == '.' || currChar == '_' || (currChar >= '0' && currChar <= '9'))
                            parName += currChar;
                        else if (currChar == ']')
                            currT = tEc1;
                        else
                            currT = tNone;
                        break;
                }
                rtfString += currChar;
            }
            if (!checkBlockEnding(rootCmd)) {
                alert('Nìkde chybí [[E]]');
            }
            else {
                //escaped string
                //http://stackoverflow.com/questions/1368020/how-to-output-unicode-string-to-rtf-using-c
                return rootCmd.genRtf() + preRtf + rtfString; //pridat zbytek
            }
        };
        self.generate = function (struct, level) {
            var singlevaluetmp = '<div class="[[widthstyle]]">\r\n' +
                '<label class="control-label col-sm-2">[[label]]</label>\r\n' +
                '<div class="well well-sm col-sm-10" style="background-color: #ffc;">[[I:value]] </div>\r\n' +
                '</div>\r\n';

            var counter = 5555;
            var processor = {
                multipleselection: function (struct, callback) {
                    var valuetmp = singlevaluetmp;
                    var widthstyle = struct.widthStyle || '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]').replace('[[widthstyle]]', widthstyle);
                    if (callback) {
                      resultvalue = callback(struct.label) + resultvalue;
                    }
                    return resultvalue;
                },
                singleselection: function (struct, callback) {
                    var valuetmp = singlevaluetmp;
                    var widthstyle = struct.widthStyle || '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]').replace('[[widthstyle]]', widthstyle);
                    if (callback) {
                      resultvalue = callback(struct.label) + resultvalue;
                    }
                    return resultvalue;
                },
                extdata: function (struct, callback) {
                    var valuetmp = singlevaluetmp;
                    var widthstyle = struct.widthStyle || '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]').replace('[[widthstyle]]', widthstyle);
                    if (callback) {
                      resultvalue = callback(struct.label) + resultvalue;
                    }
                    return resultvalue;
                },
                inlinetext: function (struct, callback) {
                    var valuetmp = singlevaluetmp;
                    var widthstyle = struct.widthStyle || '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]').replace('[[widthstyle]]', widthstyle);
                    if (callback) {
                      resultvalue = callback(struct.label) + resultvalue;
                    }
                    return resultvalue;
                },
                multitext: function (struct, callback) {
                    var valuetmp = singlevaluetmp;
                    var widthstyle = struct.widthStyle || '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]').replace('[[widthstyle]]', widthstyle);
                    if (callback) {
                      resultvalue = callback(struct.label) + resultvalue;
                    }
                    return resultvalue;
                },
                group: function (struct, callback, level) {
                    var innerlevel = level || 0;
                    innerlevel = innerlevel + 1
                    //var delimiter = '{\pard some text.\par}{\pard {\*\do\dobxcolumn\dobypara\dodhgt\dpline\dpxsize9200\dplinesolid\dplinew30}\par}{\pard some text.\par}'
                    var delimiter = '';
                    var widthstyle = struct.widthStyle || '';
                    var valuetmp = '<div id="[[id]]" class="container-fluid">\r\n' +
                        '<h4>[[label]]</h4>\r\n' +
                        '<div class="well col-sm-12">[[I:value]] </div>\r\n' +
                        '</div>\r\n';
                        valuetmp = valuetmp.replace('[[id]]', counter++);
                        console.log(valuetmp);
                    var resultbody = '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[widthstyle]]', widthstyle);
                    if (struct.children) {
                        for (var i = 0; i < struct.children.length; i++) {
                            //console.log('item> ' + i);
                            var item = struct.children[i];
                            var componentname = item.component;
                            var functiontocall = processor[componentname];
                            if (functiontocall != undefined)
                                resultbody = resultbody + functiontocall(item, callback, innerlevel) + '\r\n';
                        }
                        resultvalue = resultvalue.replace('[[I:value]]', '[[W:' + struct.id + ']]' + resultbody + '[[E]]');
                    }
                    //console.log('2> ' + resultvalue);
                    if (callback) {
                      resultvalue = callback(level, struct.label) + resultvalue;
                    }
                    return resultvalue; // + delimiter;
                },
                repeater: function (struct, callback, level) {
                    var innerlevel = level || 0;
                    innerlevel = innerlevel + 1
                    var widthstyle = struct.widthStyle || '';
                    var valuetmp = '<div id="[[id]]" class="well [[widthstyle]]">\r\n' +
                        '<h4>[[label]]</h4>\r\n' +
                        '<div>[[I:value]] </div>\r\n' +
                        '</div>\r\n';
                        valuetmp = valuetmp.replace('[[id]]', counter++);
                    var resultbody = '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[widthstyle]]', widthstyle);
                    if (struct.template.children) {
                        for (var i = 0; i < struct.template.children.length; i++) {
                            //console.log('item> ' + i);
                            var item = struct.template.children[i];
                            var componentname = item.component;
                            var functiontocall = processor[componentname];
                            if (functiontocall != undefined)
                                resultbody = resultbody + 
                                    '\r\n' + 
                                    functiontocall(item, callback, innerlevel) + 
                                    '\r\n';
                        }
                        resultvalue = resultvalue.replace('[[I:value]]', '[[F:' + struct.id + ']]' + 
                              '<div class="well col-sm-12 bs-callout-info">' +
                              resultbody + 
                              '</div>\r\n' +
                              '[[E]]');
                    }
                    //console.log('2> ' + resultvalue);
                    if (callback) {
                      resultvalue = callback(level, struct.label) + resultvalue;
                    }
                    return resultvalue;
                }
            };
            var docbegin = '<!DOCTYPE html>\r\n' +
                  '<html lang="en">\r\n' +
                  '<head>\r\n' +
                  '    <meta charset="utf-8">\r\n' +
                  '    <meta http-equiv="X-UA-Compatible" content="IE=edge">\r\n' +
                  '    <meta name="viewport" content="width=device-width, initial-scale=1">\r\n' +
                  '    <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->\r\n' +
                  '    <title>DZRO 2017</title>\r\n' +
                  '    <!-- Bootstrap -->\r\n' +
                  '    <link href="css/bootstrap.min.css" rel="stylesheet">\r\n' +
                  '    <link href="css/docs.min.css" rel="stylesheet">\r\n' +
                  '    <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->\r\n' +
                  '    <!-- WARNING: Respond.js doesn\'t work if you view the page via file:// -->\r\n' +
                  '    <!--[if lt IE 9]>\r\n' +
                  '      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>\r\n' +
                  '      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>\r\n' +
                  '    <![endif]-->\r\n' +
                  ' <style>' + 
                  ' body { padding-top: 70px; position: relative;}' +
                  '  container-fluid {padding-top:50px;height:100%;}' + 
                  ' </style>'+
                  '</head>\r\n';
                  
            var docend = '</div>\r\n' +
                  '</body>\r\n' +
                  '</html>';
                  
            var header =  
                  '<body id="myPage" data-spy="scroll" data-target=".navbar" data-offset="60">\r\n' +
                  '    <!-- jQuery (necessary for Bootstrap\'s JavaScript plugins) -->\r\n' +
                  '    <script src="scripts/lib/jquery-2.2.3.min.js"></script>\r\n' +
                  '    <!-- Include all compiled plugins (below), or include individual files as needed -->\r\n' +
                  '    <script src="scripts/lib/bootstrap.min.js"></script>\r\n' +
                  
                  '    <nav class="navbar navbar-inverse navbar-fixed-top">\r\n' +
                  '      <div class="container-fluid">\r\n' +
                  '        <div class="navbar-header">\r\n' +
                  '            <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">\r\n' +
                  '              <span class="icon-bar"></span>\r\n' +
                  '              <span class="icon-bar"></span>\r\n' +
                  '              <span class="icon-bar"></span>       \r\n' +                 
                  '          </button>\r\n' +
                  '          <a class="navbar-brand" href="#">Home</a>\r\n' +
                  '        </div>\r\n' +
                  '        <div>\r\n' +
                  '          <div class="collapse navbar-collapse" id="myNavbar">\r\n' +
                  '            <ul class="nav navbar-nav">\r\n' +
                  '[[links]]' +
                  '            </ul>\r\n' +
                  '          </div>\r\n' +
                  '        </div>\r\n' +
                  '      </div>\r\n' +
                  '    </nav>         \r\n';         
                  
            var component = struct.component;
            //console.log(JSON.stringify(struct));
            var links = '';
            var firstlevelcallback = function(level, name) {
                var result = '<div class="container-fluid" id="[[refid]]">.</div>'.replace('[[refid]]', 'ref' + counter);
                var link = '<li><a href="#[[refid]]">[[label]]</a></li>\r\n'.replace('[[refid]]', 'ref' + counter).replace('[[label]]', name);
                if (level == 1) {
                    links = links + link;
                }
                result = '';
                return result;
            };
            var functiontocall = processor[component];
            var body = self.rtfUnicode(functiontocall(struct, firstlevelcallback));
            var newheader = header.replace('[[links]]', links);
            var result = docbegin + 
                newheader + 
                body +
                docend;
            console.log(links);
            console.log(newheader);
            return result;
        };
    };
