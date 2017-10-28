rtf = function () {
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
        self.generate = function (struct) {
            var processor = {
                multipleselection: function (struct) {
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\tab }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]');
                    return resultvalue;
                },
                singleselection: function (struct) {
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\tab }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]');
                    return resultvalue;
                },
                extdata: function (struct) {
                    var valuetmp = '' //'\pard \ltrpar\ql \li0\ri0\sa160\sl259\slmult1\widctlpar\tx1418\wrapdefault\aspalpha\aspnum\faauto\adjustright\rin0\lin0\itap0\pararsid879038 '
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\tab }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]');
                    return resultvalue;
                },
                inlinetext: function (struct) {
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\tab }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]');
                    return resultvalue;
                },
                multitext: function (struct) {
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\tab }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label).replace('[[I:value]]', '[[I:' + struct.id + ']]');
                    return resultvalue;
                },
                group: function (struct) {
                    //var delimiter = '{\pard some text.\par}{\pard {\*\do\dobxcolumn\dobypara\dodhgt\dpline\dpxsize9200\dplinesolid\dplinew30}\par}{\pard some text.\par}'
                    var delimiter = '{\pard \brdrb \brdrs\brdrw10\brsp20 {\fs4\~}\par \pard}';
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\par }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultbody = '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label);
                    if (struct.children) {
                        for (var i = 0; i < struct.children.length; i++) {
                            //console.log('item> ' + i);
                            var item = struct.children[i];
                            var componentname = item.component;
                            var functiontocall = processor[componentname];
                            if (functiontocall != undefined)
                                resultbody = resultbody + functiontocall(item);
                        }
                        resultvalue = resultvalue.replace('[[I:value]]', '[[W:' + struct.id + ']]' + resultbody + '[[E]]');
                    }
                    //console.log('2> ' + resultvalue);
                    return resultvalue; // + delimiter;
                },
                repeater: function (struct) {
                    var valuetmp = '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011\\charrsid10234438 [[label]]\\par }'
                        + '{\\rtlch\\fcs1 \\af31507 \\ltrch\\fcs0 \\lang2057\\langfe1033\\langnp2057\\insrsid1116011 [[I:value]] \\par }'
                        + '\\pard \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 ';
                    var resultbody = '';
                    var resultvalue = valuetmp.replace('[[label]]', struct.label);
                    if (struct.template.children) {
                        for (var i = 0; i < struct.template.children.length; i++) {
                            //console.log('item> ' + i);
                            var item = struct.template.children[i];
                            var componentname = item.component;
                            var functiontocall = processor[componentname];
                            if (functiontocall != undefined)
                                resultbody = resultbody + functiontocall(item);
                        }
                        resultvalue = resultvalue.replace('[[I:value]]', '[[F:' + struct.id + ']]' + resultbody + '[[E]]');
                    }
                    //console.log('2> ' + resultvalue);
                    return resultvalue;
                }
            };
            var docbegin = '{\\rtf1\\adeflang1025\\ansi\\ansicpg1250\\uc1\\adeff31507\\deff0\\stshfdbch31506\\stshfloch31506\\stshfhich31506\\stshfbi31507\\deflang1029\\deflangfe1029\\themelang1029\\themelangfe0\\themelangcs0{\\fonttbl{\\f0\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}' +
                '{\\f0\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}{\\f39\\fbidi \\fswiss\\fcharset238\\fprq2{\\*\\panose 020f0502020204030204}Calibri;}' +
                '{\\flomajor\\f31500\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}{\\fdbmajor\\f31501\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}' +
                '{\\fhimajor\\f31502\\fbidi \\fswiss\\fcharset238\\fprq2{\\*\\panose 020f0302020204030204}Calibri Light;}{\\fbimajor\\f31503\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}' +
                '{\\flominor\\f31504\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}{\\fdbminor\\f31505\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}' +
                '{\\fhiminor\\f31506\\fbidi \\fswiss\\fcharset238\\fprq2{\\*\\panose 020f0502020204030204}Calibri;}{\\fbiminor\\f31507\\fbidi \\froman\\fcharset238\\fprq2{\\*\\panose 02020603050405020304}Times New Roman;}{\\f42\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}' +
                '{\\f41\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}{\\f43\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\f44\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\f45\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}' +
                '{\\f46\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\f47\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\f48\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}{\\f42\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}' +
                '{\\f41\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}{\\f43\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\f44\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\f45\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}' +
                '{\\f46\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\f47\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\f48\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}{\\f432\\fbidi \\fswiss\\fcharset0\\fprq2 Calibri;}' +
                '{\\f431\\fbidi \\fswiss\\fcharset204\\fprq2 Calibri Cyr;}{\\f433\\fbidi \\fswiss\\fcharset161\\fprq2 Calibri Greek;}{\\f434\\fbidi \\fswiss\\fcharset162\\fprq2 Calibri Tur;}{\\f435\\fbidi \\fswiss\\fcharset177\\fprq2 Calibri (Hebrew);}' +
                '{\\f436\\fbidi \\fswiss\\fcharset178\\fprq2 Calibri (Arabic);}{\\f437\\fbidi \\fswiss\\fcharset186\\fprq2 Calibri Baltic;}{\\f438\\fbidi \\fswiss\\fcharset163\\fprq2 Calibri (Vietnamese);}{\\flomajor\\f31510\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}' +
                '{\\flomajor\\f31509\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}{\\flomajor\\f31511\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\flomajor\\f31512\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}' +
                '{\\flomajor\\f31513\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}{\\flomajor\\f31514\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\flomajor\\f31515\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}' +
                '{\\flomajor\\f31516\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}{\\fdbmajor\\f31520\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}{\\fdbmajor\\f31519\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}' +
                '{\\fdbmajor\\f31521\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\fdbmajor\\f31522\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\fdbmajor\\f31523\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}' +
                '{\\fdbmajor\\f31524\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\fdbmajor\\f31525\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\fdbmajor\\f31526\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}' +
                '{\\fhimajor\\f31530\\fbidi \\fswiss\\fcharset0\\fprq2 Calibri Light;}{\\fhimajor\\f31529\\fbidi \\fswiss\\fcharset204\\fprq2 Calibri Light Cyr;}{\\fhimajor\\f31531\\fbidi \\fswiss\\fcharset161\\fprq2 Calibri Light Greek;}' +
                '{\\fhimajor\\f31532\\fbidi \\fswiss\\fcharset162\\fprq2 Calibri Light Tur;}{\\fhimajor\\f31533\\fbidi \\fswiss\\fcharset177\\fprq2 Calibri Light (Hebrew);}{\\fhimajor\\f31534\\fbidi \\fswiss\\fcharset178\\fprq2 Calibri Light (Arabic);}' +
                '{\\fhimajor\\f31535\\fbidi \\fswiss\\fcharset186\\fprq2 Calibri Light Baltic;}{\\fhimajor\\f31536\\fbidi \\fswiss\\fcharset163\\fprq2 Calibri Light (Vietnamese);}{\\fbimajor\\f31540\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}' +
                '{\\fbimajor\\f31539\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}{\\fbimajor\\f31541\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\fbimajor\\f31542\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}' +
                '{\\fbimajor\\f31543\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}{\\fbimajor\\f31544\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\fbimajor\\f31545\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}' +
                '{\\fbimajor\\f31546\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}{\\flominor\\f31550\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}{\\flominor\\f31549\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}' +
                '{\\flominor\\f31551\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\flominor\\f31552\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\flominor\\f31553\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}' +
                '{\\flominor\\f31554\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\flominor\\f31555\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\flominor\\f31556\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}' +
                '{\\fdbminor\\f31560\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}{\\fdbminor\\f31559\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}{\\fdbminor\\f31561\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}' +
                '{\\fdbminor\\f31562\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\fdbminor\\f31563\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}{\\fdbminor\\f31564\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}' +
                '{\\fdbminor\\f31565\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\fdbminor\\f31566\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}{\\fhiminor\\f31570\\fbidi \\fswiss\\fcharset0\\fprq2 Calibri;}' +
                '{\\fhiminor\\f31569\\fbidi \\fswiss\\fcharset204\\fprq2 Calibri Cyr;}{\\fhiminor\\f31571\\fbidi \\fswiss\\fcharset161\\fprq2 Calibri Greek;}{\\fhiminor\\f31572\\fbidi \\fswiss\\fcharset162\\fprq2 Calibri Tur;}' +
                '{\\fhiminor\\f31573\\fbidi \\fswiss\\fcharset177\\fprq2 Calibri (Hebrew);}{\\fhiminor\\f31574\\fbidi \\fswiss\\fcharset178\\fprq2 Calibri (Arabic);}{\\fhiminor\\f31575\\fbidi \\fswiss\\fcharset186\\fprq2 Calibri Baltic;}' +
                '{\\fhiminor\\f31576\\fbidi \\fswiss\\fcharset163\\fprq2 Calibri (Vietnamese);}{\\fbiminor\\f31580\\fbidi \\froman\\fcharset0\\fprq2 Times New Roman;}{\\fbiminor\\f31579\\fbidi \\froman\\fcharset204\\fprq2 Times New Roman Cyr;}' +
                '{\\fbiminor\\f31581\\fbidi \\froman\\fcharset161\\fprq2 Times New Roman Greek;}{\\fbiminor\\f31582\\fbidi \\froman\\fcharset162\\fprq2 Times New Roman Tur;}{\\fbiminor\\f31583\\fbidi \\froman\\fcharset177\\fprq2 Times New Roman (Hebrew);}' +
                '{\\fbiminor\\f31584\\fbidi \\froman\\fcharset178\\fprq2 Times New Roman (Arabic);}{\\fbiminor\\f31585\\fbidi \\froman\\fcharset186\\fprq2 Times New Roman Baltic;}{\\fbiminor\\f31586\\fbidi \\froman\\fcharset163\\fprq2 Times New Roman (Vietnamese);}}' +
                '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;\\red0\\green255\\blue255;\\red0\\green255\\blue0;\\red255\\green0\\blue255;\\red255\\green0\\blue0;\\red255\\green255\\blue0;\\red255\\green255\\blue255;\\red0\\green0\\blue128;\\red0\\green128\\blue128;\\red0\\green128\\blue0;' +
                '\\red128\\green0\\blue128;\\red128\\green0\\blue0;\\red128\\green128\\blue0;\\red128\\green128\\blue128;\\red192\\green192\\blue192;}{\\*\\defchp \\f31506\\fs22\\lang1029\\langfe1033\\langfenp1033 }{\\*\\defpap \\ql \\li0\\ri0\\sa160\\sl259\\slmult1' +
                '\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 }\\noqfpromote {\\stylesheet{\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af31507\\afs22\\alang1025 ' +
                '\\ltrch\\fcs0 \\f31506\\fs22\\lang1029\\langfe1033\\cgrid\\langnp1029\\langfenp1033 \\snext0 \\sqformat \\spriority0 Normal;}{\\*\\cs10 \\additive \\ssemihidden \\sunhideused \\spriority1 Default Paragraph Font;}{\\*' +
                '\\ts11\\tsrowd\\trftsWidthB3\\trpaddl108\\trpaddr108\\trpaddfl3\\trpaddft3\\trpaddfb3\\trpaddfr3\\tblind0\\tblindtype3\\tsvertalt\\tsbrdrt\\tsbrdrl\\tsbrdrb\\tsbrdrr\\tsbrdrdgl\\tsbrdrdgr\\tsbrdrh\\tsbrdrv \\ql \\li0\\ri0\\sa160\\sl259\\slmult1' +
                '\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af31507\\afs22\\alang1025 \\ltrch\\fcs0 \\f31506\\fs22\\lang1029\\langfe1033\\cgrid\\langnp1029\\langfenp1033 \\snext11 \\ssemihidden \\sunhideused Normal Table;}}' +
                '{\\*\\rsidtbl \\rsid5554\\rsid1116011\\rsid2834700\\rsid8081656\\rsid10234438\\rsid13203504}{\\mmathPr\\mmathFont34\\mbrkBin0\\mbrkBinSub0\\msmallFrac0\\mdispDef1\\mlMargin0\\mrMargin0\\mdefJc1\\mwrapIndent1440\\mintLim0\\mnaryLim1}{\\info{\\author Alexandr \\\'8atefek}' +
                '{\\operator Alexandr \\\'8atefek}{\\creatim\\yr2016\\mo11\\dy2\\hr17\\min3}{\\revtim\\yr2016\\mo11\\dy2\\hr17\\min9}{\\version2}{\\edmins6}{\\nofpages1}{\\nofwords5}{\\nofchars33}{\\nofcharsws37}{\\vern11}}{\\*\\xmlnstbl {\\xmlns1 http://schemas.microsoft.com/office/word/2003/wor' +
                'dml}}\\paperw11906\\paperh16838\\margl1417\\margr1417\\margt1417\\margb1417\\gutter0\\ltrsect ' +
                '\\deftab708\\widowctrl\\ftnbj\\aenddoc\\hyphhotz425\\trackmoves0\\trackformatting1\\donotembedsysfont1\\relyonvml0\\donotembedlingdata0\\grfdocevents0\\validatexml1\\showplaceholdtext0\\ignoremixedcontent0\\saveinvalidxml0' +
                '\\showxmlerrors1\\noxlattoyen\\expshrtn\\noultrlspc\\dntblnsbdb\\nospaceforul\\formshade\\horzdoc\\dgmargin\\dghspace180\\dgvspace180\\dghorigin1417\\dgvorigin1417\\dghshow1\\dgvshow1' +
                '\\jexpand\\viewkind1\\viewscale100\\pgbrdrhead\\pgbrdrfoot\\splytwnine\\ftnlytwnine\\htmautsp\\nolnhtadjtbl\\useltbaln\\alntblind\\lytcalctblwd\\lyttblrtgr\\lnbrkrule\\nobrkwrptbl\\snaptogridincell\\allowfieldendsel\\wrppunct' +
                '\\asianbrkrule\\rsidroot1116011\\newtblstyruls\\nogrowautofit\\usenormstyforlist\\noindnmbrts\\felnbrelev\\nocxsptable\\indrlsweleven\\noafcnsttbl\\afelev\\utinl\\hwelev\\spltpgpar\\notcvasp\\notbrkcnstfrctbl\\notvatxbx\\krnprsnet\\cachedcolbal \\nouicompat \\fet0' +
                '{\\*\\wgrffmtfilter 2450}\\nofeaturethrottle1\\ilfomacatclnup0\\ltrpar \\sectd \\ltrsect\\linex0\\headery708\\footery708\\colsx708\\endnhere\\sectlinegrid360\\sectdefaultcl\\sftnbj {\\*\\pnseclvl1\\pnucrm\\pnstart1\\pnindent720\\pnhang {\\pntxta .}}{\\*\\pnseclvl2' +
                '\\pnucltr\\pnstart1\\pnindent720\\pnhang {\\pntxta .}}{\\*\\pnseclvl3\\pndec\\pnstart1\\pnindent720\\pnhang {\\pntxta .}}{\\*\\pnseclvl4\\pnlcltr\\pnstart1\\pnindent720\\pnhang {\\pntxta )}}{\\*\\pnseclvl5\\pndec\\pnstart1\\pnindent720\\pnhang {\\pntxtb (}{\\pntxta )}}{\\*\\pnseclvl6' +
                '\\pnlcltr\\pnstart1\\pnindent720\\pnhang {\\pntxtb (}{\\pntxta )}}{\\*\\pnseclvl7\\pnlcrm\\pnstart1\\pnindent720\\pnhang {\\pntxtb (}{\\pntxta )}}{\\*\\pnseclvl8\\pnlcltr\\pnstart1\\pnindent720\\pnhang {\\pntxtb (}{\\pntxta )}}{\\*\\pnseclvl9\\pnlcrm\\pnstart1\\pnindent720\\pnhang ' +
                '{\\pntxtb (}{\\pntxta )}}\\pard\\plain \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af31507\\afs22\\alang1025 \\ltrch\\fcs0 ' +
                '\\f31506\\fs22\\lang1029\\langfe1033\\cgrid\\langnp1029\\langfenp1033 ';
            var docend = '{\\*\\themedata 504b030414000600080000002100e9de0fbfff0000001c020000130000005b436f6e74656e745f54797065735d2e786d6cac91cb4ec3301045f748fc83e52d4a' +
                '9cb2400825e982c78ec7a27cc0c8992416c9d8b2a755fbf74cd25442a820166c2cd933f79e3be372bd1f07b5c3989ca74aaff2422b24eb1b475da5df374fd9ad' +
                '5689811a183c61a50f98f4babebc2837878049899a52a57be670674cb23d8e90721f90a4d2fa3802cb35762680fd800ecd7551dc18eb899138e3c943d7e503b6' +
                'b01d583deee5f99824e290b4ba3f364eac4a430883b3c092d4eca8f946c916422ecab927f52ea42b89a1cd59c254f919b0e85e6535d135a8de20f20b8c12c3b0' +
                '0c895fcf6720192de6bf3b9e89ecdbd6596cbcdd8eb28e7c365ecc4ec1ff1460f53fe813d3cc7f5b7f020000ffff0300504b030414000600080000002100a5d6' +
                'a7e7c0000000360100000b0000005f72656c732f2e72656c73848fcf6ac3300c87ef85bd83d17d51d2c31825762fa590432fa37d00e1287f68221bdb1bebdb4f' +
                'c7060abb0884a4eff7a93dfeae8bf9e194e720169aaa06c3e2433fcb68e1763dbf7f82c985a4a725085b787086a37bdbb55fbc50d1a33ccd311ba548b6309512' +
                '0f88d94fbc52ae4264d1c910d24a45db3462247fa791715fd71f989e19e0364cd3f51652d73760ae8fa8c9ffb3c330cc9e4fc17faf2ce545046e37944c69e462' +
                'a1a82fe353bd90a865aad41ed0b5b8f9d6fd010000ffff0300504b0304140006000800000021006b799616830000008a0000001c0000007468656d652f746865' +
                '6d652f7468656d654d616e616765722e786d6c0ccc4d0ac3201040e17da17790d93763bb284562b2cbaebbf600439c1a41c7a0d29fdbd7e5e38337cedf14d59b' +
                '4b0d592c9c070d8a65cd2e88b7f07c2ca71ba8da481cc52c6ce1c715e6e97818c9b48d13df49c873517d23d59085adb5dd20d6b52bd521ef2cdd5eb9246a3d8b' +
                '4757e8d3f729e245eb2b260a0238fd010000ffff0300504b030414000600080000002100b8c40273e10600009b1a0000160000007468656d652f7468656d652f' +
                '7468656d65312e786d6cec59cf8b1b3714be17fa3f0c7377fc6bc63f9678833db6b3edee2621765272d4dab24759cdc88ce4dd981028c9a99742212d2d34d09e' +
                '7a28a581061a7ae9a1f42f594868d33fa24f9af158b2b59bcd92422859c33296bff7f4e9bd37dfd38c2e5fb91751e708279cb0b8e5962f955c07c7233626f1b4' +
                'e5de1af60b0dd7e102c56344598c5bee0273f7caf6871f5c465b22c41176c03ee65ba8e58642ccb68a453e8261c42fb1198ee1b7094b2224e06b322d8e13740c' +
                '7e235aac944ab5628448ec3a318ac0ed3e13e4c8b93e99901176b797ce7b146688059703239a0ca46b9c59eca27884e91fdffff98dc28f0fcb12c5173ca08973' +
                '8468cb85b9c6ec7888ef09d7a1880bf8a1e596d49f5bdcbe5c445b991115a7d86a767df597d96506e3c38a9a33991ee4937a9eefd5dab97f05a06213d7abf76a' +
                'bd5aee4f01d06804ab4db9e83efd4eb3d3f533ac064a2f2dbebbf56eb56ce035ffd50dce6d5f7e0cbc02a5febd0d7cbf1f40140dbc02a5787f03ef79f54ae019' +
                '78054af1b50d7cbdd4ee7a7503af402125f1e106bae4d7aac172b53964c2e88e15def4bd7ebd92395fa1a01af20a93534c582cceaab708dd65491f40124c9120' +
                'b12316333c4123a8e60051729010678f4c4328be198a1987e152a5d42f55e1bffc78ea4a45056d61a4594b6ec0866f0c494e0e1f2564265aeec7e0d5d5202f9e' +
                '3f3f79f8ece4e1af278f1e9d3cfc399b5bb932ec76503cd5ed5efdf0c53f4f3e75fefee5bb578fbf4ca75ec7731dfff2a7cf5efef6fb59ee61c5ab50bcf8eae9' +
                'cb674f5f7cfdf95f3f3eb6786f27e840870f4984b9730d1f3b3759040bb4f0c707c99b590c4344748b763ce5284672168bff9e080df4b505a2c882eb60338eb7' +
                '13901b1bf0eafcae4178102673412c1e77c3c800ee33463b2cb1466157cea58579388fa7f6c993b98ebb89d0916dee00c546967bf319682db1b90c426cd0bc41' +
                '512cd014c75838f2377688b16575770831e2ba4f4609e36c229c3bc4e920620dc9901c18d5b432da2111e465612308f93662b37fdbe9306a5b75171f9948b837' +
                '10b5901f626a84f12a9a0b14d95c0e5144f580ef2111da480e16c948c7f5b8804c4f31654e6f8c39b7d95c4f60bd5ad2774166ec69dfa78bc84426821cda7cee' +
                '21c67464971d06218a6636ec80c4a18efd881f428922e7061336f83e33ef10f91df280e253d37d9b6023ddaf57835ba0b03aa55581c85fe6892597573133ea77' +
                'b0a0138495d4401330743d22f16b457e4ddefdff4ede41445f7cfbc4b2a2b723e976c7463ede50ccdb09b1de4d3b6b127e1a6e5db803968cc9bbafdb5d348f6f' +
                '60b855369bd77bd97e2fdbeeff5eb64fbb9fdfbe58aff419a45b6e5bd32dbbdac04767eedf2784d2815850bcc7d5169e43671af76150daaa67589c3fd3cd42b8' +
                '9477334c62e0a60952364ec2c42744848310cd609f5f76a59329cf5c4fb933631cb6ff6ad8ea5be2e93cda67e3f4d1b55c968fa9a980702456e3253f1f87470e' +
                '91a26bf5d5e358ee5eb19daa47e7250169fb2624b4c94c12550b89fa725006493da843d02c24d4cade0a8ba6854543ba5fa66a830550cbb3025b2707365c2dd7' +
                'f7c0048ce0c90a513c96794a53bdccae4ae6dbccf469c1342a00f611cb0a5865ba29b99eba3cb9bab4d4ce91698384566e26091519d5c77888c638ab4e397a1e' +
                '1a6f9aebe62aa5063d190a351f94d68a46bd71168b8be61aecd6b581c6ba52d0d8396eb9b5aa0f253342b3963b81c77fb88c66503b5c6e79119dc2bbb49148d2' +
                '1bfe22ca324bb8e8221ea60157a293aa4144044e1c4aa2962b979fa781c64a4314b7720504e19d25d7045979d7c841d2cd24e3c9048f849e766d44463afd0a0a' +
                '9f6a85f557657e71b0b4647348f7201c1f3b07749edc4450627ebd2c0338261cde0295d3688e09bcdacc856c557f6b8d29935dfddda2aaa1741cd15988b28ea2' +
                '8b790a57529ed351dff21868dfb2354340b590648df0602a1bac1e54a39be65d23e5706ad77dbd918c9c269aab9e69a88aec9a7615336658b681b5585eacc96b' +
                'ac9621064dd33b7c2addeb92db5c6addda3e21ef1210f03c7e96ae7b8e86a0515b4d6650938c3765586a76366af68ee5025f43ed3c4d4253fddad2ed5adcf21e' +
                '619d0e062fd4f9c16ebd6a6168b2dc5baa48ab7310fda8821ddc05f1e8c2cbe039155ca5120e2112041ba281da93a4b201b7c83d91dd1a70e5cc13d272ef97fc' +
                'b61754fca0506af8bd8257f54a8586dfae16dabe5f2df7fc72a9dba93c80c622c2a8eca767307d78154517d9498c1adf388d89966fdb2e8d585464ea9ca5a888' +
                'abd39872c5388d49cf619ca13c6e711d02a273bf56e937abcd4eadd0acb6fb05afdb69149a41ad53e8d6827ab7df0dfc46b3ffc0758e14d86b5703afd66b146a' +
                'e5202878b592a4df6816ea5ea5d2f6eaed46cf6b3fc8b631b0f2543eb258407815afed7f010000ffff0300504b0304140006000800000021000dd1909fb60000' +
                '001b010000270000007468656d652f7468656d652f5f72656c732f7468656d654d616e616765722e786d6c2e72656c73848f4d0ac2301484f78277086f6fd3ba' +
                '109126dd88d0add40384e4350d363f2451eced0dae2c082e8761be9969bb979dc9136332de3168aa1a083ae995719ac16db8ec8e4052164e89d93b64b060828e' +
                '6f37ed1567914b284d262452282e3198720e274a939cd08a54f980ae38a38f56e422a3a641c8bbd048f7757da0f19b017cc524bd62107bd5001996509affb3fd' +
                '381a89672f1f165dfe514173d9850528a2c6cce0239baa4c04ca5bbabac4df000000ffff0300504b01022d0014000600080000002100e9de0fbfff0000001c02' +
                '00001300000000000000000000000000000000005b436f6e74656e745f54797065735d2e786d6c504b01022d0014000600080000002100a5d6a7e7c000000036' +
                '0100000b00000000000000000000000000300100005f72656c732f2e72656c73504b01022d00140006000800000021006b799616830000008a0000001c000000' +
                '00000000000000000000190200007468656d652f7468656d652f7468656d654d616e616765722e786d6c504b01022d0014000600080000002100b8c40273e106' +
                '00009b1a00001600000000000000000000000000d60200007468656d652f7468656d652f7468656d65312e786d6c504b01022d00140006000800000021000dd1' +
                '909fb60000001b0100002700000000000000000000000000eb0900007468656d652f7468656d652f5f72656c732f7468656d654d616e616765722e786d6c2e72656c73504b050600000000050005005d010000e60a00000000}' +
                '{\\*\\colorschememapping 3c3f786d6c2076657273696f6e3d22312e302220656e636f64696e673d225554462d3822207374616e64616c6f6e653d22796573223f3e0d0a3c613a636c724d' +
                '617020786d6c6e733a613d22687474703a2f2f736368656d61732e6f70656e786d6c666f726d6174732e6f72672f64726177696e676d6c2f323030362f6d6169' +
                '6e22206267313d226c743122207478313d22646b3122206267323d226c743222207478323d22646b322220616363656e74313d22616363656e74312220616363' +
                '656e74323d22616363656e74322220616363656e74333d22616363656e74332220616363656e74343d22616363656e74342220616363656e74353d22616363656e74352220616363656e74363d22616363656e74362220686c696e6b3d22686c696e6b2220666f6c486c696e6b3d22666f6c486c696e6b222f3e}' +
                '{\\*\\latentstyles\\lsdstimax372\\lsdlockeddef0\\lsdsemihiddendef0\\lsdunhideuseddef0\\lsdqformatdef0\\lsdprioritydef99{\\lsdlockedexcept \\lsdqformat1 \\lsdpriority0 \\lsdlocked0 Normal;\\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 1;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 4;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 6;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 7;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 8;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority9 \\lsdlocked0 heading 9;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 1;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 5;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 6;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 7;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 8;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index 9;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 6;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 7;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 8;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority39 \\lsdlocked0 toc 9;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Normal Indent;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 footnote text;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 annotation text;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 header;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 footer;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 index heading;\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority35 \\lsdlocked0 caption;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 table of figures;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 envelope address;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 envelope return;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 footnote reference;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 annotation reference;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 line number;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 page number;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 endnote reference;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 endnote text;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 table of authorities;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 macro;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 toa heading;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Bullet;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Number;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Bullet 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Bullet 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Bullet 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Bullet 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Number 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Number 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Number 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Number 5;\\lsdqformat1 \\lsdpriority10 \\lsdlocked0 Title;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Closing;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Signature;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority1 \\lsdlocked0 Default Paragraph Font;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text Indent;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Continue;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Continue 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Continue 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Continue 4;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 List Continue 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Message Header;\\lsdqformat1 \\lsdpriority11 \\lsdlocked0 Subtitle;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Salutation;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Date;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text First Indent;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text First Indent 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Note Heading;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text Indent 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Body Text Indent 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Block Text;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Hyperlink;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 FollowedHyperlink;\\lsdqformat1 \\lsdpriority22 \\lsdlocked0 Strong;' +
                '\\lsdqformat1 \\lsdpriority20 \\lsdlocked0 Emphasis;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Document Map;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Plain Text;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 E-mail Signature;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Top of Form;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Bottom of Form;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Normal (Web);\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Acronym;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Address;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Cite;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Code;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Definition;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Keyboard;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Preformatted;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Sample;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Typewriter;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 HTML Variable;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 annotation subject;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 No List;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Outline List 1;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Outline List 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Outline List 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Simple 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Simple 2;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Simple 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Classic 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Classic 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Classic 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Classic 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Colorful 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Colorful 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Colorful 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Columns 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Columns 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Columns 3;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Columns 4;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Columns 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 6;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 7;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Grid 8;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 4;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 5;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 6;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 7;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table List 8;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table 3D effects 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table 3D effects 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table 3D effects 3;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Contemporary;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Elegant;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Professional;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Subtle 1;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Subtle 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Web 1;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Table Web 2;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Balloon Text;' +
                '\\lsdpriority39 \\lsdlocked0 Table Grid;\\lsdsemihidden1 \\lsdlocked0 Placeholder Text;\\lsdqformat1 \\lsdpriority1 \\lsdlocked0 No Spacing;\\lsdpriority60 \\lsdlocked0 Light Shading;\\lsdpriority61 \\lsdlocked0 Light List;\\lsdpriority62 \\lsdlocked0 Light Grid;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1;\\lsdpriority64 \\lsdlocked0 Medium Shading 2;\\lsdpriority65 \\lsdlocked0 Medium List 1;\\lsdpriority66 \\lsdlocked0 Medium List 2;\\lsdpriority67 \\lsdlocked0 Medium Grid 1;\\lsdpriority68 \\lsdlocked0 Medium Grid 2;' +
                '\\lsdpriority69 \\lsdlocked0 Medium Grid 3;\\lsdpriority70 \\lsdlocked0 Dark List;\\lsdpriority71 \\lsdlocked0 Colorful Shading;\\lsdpriority72 \\lsdlocked0 Colorful List;\\lsdpriority73 \\lsdlocked0 Colorful Grid;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 1;' +
                '\\lsdpriority61 \\lsdlocked0 Light List Accent 1;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 1;\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 1;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 1;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 1;' +
                '\\lsdsemihidden1 \\lsdlocked0 Revision;\\lsdqformat1 \\lsdpriority34 \\lsdlocked0 List Paragraph;\\lsdqformat1 \\lsdpriority29 \\lsdlocked0 Quote;\\lsdqformat1 \\lsdpriority30 \\lsdlocked0 Intense Quote;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 1;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 1;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 1;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 1;\\lsdpriority70 \\lsdlocked0 Dark List Accent 1;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 1;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 1;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 1;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 2;\\lsdpriority61 \\lsdlocked0 Light List Accent 2;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 2;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 2;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 2;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 2;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 2;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 2;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 2;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 2;\\lsdpriority70 \\lsdlocked0 Dark List Accent 2;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 2;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 2;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 2;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 3;\\lsdpriority61 \\lsdlocked0 Light List Accent 3;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 3;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 3;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 3;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 3;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 3;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 3;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 3;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 3;\\lsdpriority70 \\lsdlocked0 Dark List Accent 3;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 3;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 3;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 3;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 4;\\lsdpriority61 \\lsdlocked0 Light List Accent 4;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 4;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 4;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 4;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 4;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 4;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 4;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 4;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 4;\\lsdpriority70 \\lsdlocked0 Dark List Accent 4;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 4;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 4;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 4;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 5;\\lsdpriority61 \\lsdlocked0 Light List Accent 5;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 5;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 5;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 5;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 5;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 5;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 5;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 5;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 5;\\lsdpriority70 \\lsdlocked0 Dark List Accent 5;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 5;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 5;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 5;\\lsdpriority60 \\lsdlocked0 Light Shading Accent 6;\\lsdpriority61 \\lsdlocked0 Light List Accent 6;\\lsdpriority62 \\lsdlocked0 Light Grid Accent 6;' +
                '\\lsdpriority63 \\lsdlocked0 Medium Shading 1 Accent 6;\\lsdpriority64 \\lsdlocked0 Medium Shading 2 Accent 6;\\lsdpriority65 \\lsdlocked0 Medium List 1 Accent 6;\\lsdpriority66 \\lsdlocked0 Medium List 2 Accent 6;' +
                '\\lsdpriority67 \\lsdlocked0 Medium Grid 1 Accent 6;\\lsdpriority68 \\lsdlocked0 Medium Grid 2 Accent 6;\\lsdpriority69 \\lsdlocked0 Medium Grid 3 Accent 6;\\lsdpriority70 \\lsdlocked0 Dark List Accent 6;\\lsdpriority71 \\lsdlocked0 Colorful Shading Accent 6;' +
                '\\lsdpriority72 \\lsdlocked0 Colorful List Accent 6;\\lsdpriority73 \\lsdlocked0 Colorful Grid Accent 6;\\lsdqformat1 \\lsdpriority19 \\lsdlocked0 Subtle Emphasis;\\lsdqformat1 \\lsdpriority21 \\lsdlocked0 Intense Emphasis;' +
                '\\lsdqformat1 \\lsdpriority31 \\lsdlocked0 Subtle Reference;\\lsdqformat1 \\lsdpriority32 \\lsdlocked0 Intense Reference;\\lsdqformat1 \\lsdpriority33 \\lsdlocked0 Book Title;\\lsdsemihidden1 \\lsdunhideused1 \\lsdpriority37 \\lsdlocked0 Bibliography;' +
                '\\lsdsemihidden1 \\lsdunhideused1 \\lsdqformat1 \\lsdpriority39 \\lsdlocked0 TOC Heading;\\lsdpriority41 \\lsdlocked0 Plain Table 1;\\lsdpriority42 \\lsdlocked0 Plain Table 2;\\lsdpriority43 \\lsdlocked0 Plain Table 3;\\lsdpriority44 \\lsdlocked0 Plain Table 4;' +
                '\\lsdpriority45 \\lsdlocked0 Plain Table 5;\\lsdpriority40 \\lsdlocked0 Grid Table Light;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light;\\lsdpriority47 \\lsdlocked0 Grid Table 2;\\lsdpriority48 \\lsdlocked0 Grid Table 3;\\lsdpriority49 \\lsdlocked0 Grid Table 4;' +
                '\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful;\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 1;\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 1;' +
                '\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 1;\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 1;\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 1;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 1;' +
                '\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 1;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 2;\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 2;\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 2;' +
                '\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 2;\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 2;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 2;\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 2;' +
                '\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 3;\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 3;\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 3;\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 3;' +
                '\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 3;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 3;\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 3;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 4;' +
                '\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 4;\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 4;\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 4;\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 4;' +
                '\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 4;\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 4;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 5;\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 5;' +
                '\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 5;\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 5;\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 5;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 5;' +
                '\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 5;\\lsdpriority46 \\lsdlocked0 Grid Table 1 Light Accent 6;\\lsdpriority47 \\lsdlocked0 Grid Table 2 Accent 6;\\lsdpriority48 \\lsdlocked0 Grid Table 3 Accent 6;' +
                '\\lsdpriority49 \\lsdlocked0 Grid Table 4 Accent 6;\\lsdpriority50 \\lsdlocked0 Grid Table 5 Dark Accent 6;\\lsdpriority51 \\lsdlocked0 Grid Table 6 Colorful Accent 6;\\lsdpriority52 \\lsdlocked0 Grid Table 7 Colorful Accent 6;' +
                '\\lsdpriority46 \\lsdlocked0 List Table 1 Light;\\lsdpriority47 \\lsdlocked0 List Table 2;\\lsdpriority48 \\lsdlocked0 List Table 3;\\lsdpriority49 \\lsdlocked0 List Table 4;\\lsdpriority50 \\lsdlocked0 List Table 5 Dark;' +
                '\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful;\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 1;\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 1;\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 1;' +
                '\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 1;\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 1;\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 1;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 1;' +
                '\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 2;\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 2;\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 2;\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 2;' +
                '\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 2;\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 2;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 2;\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 3;' +
                '\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 3;\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 3;\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 3;\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 3;' +
                '\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 3;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 3;\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 4;\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 4;' +
                '\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 4;\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 4;\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 4;\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 4;' +
                '\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 4;\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 5;\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 5;\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 5;' +
                '\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 5;\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 5;\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 5;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 5;' +
                '\\lsdpriority46 \\lsdlocked0 List Table 1 Light Accent 6;\\lsdpriority47 \\lsdlocked0 List Table 2 Accent 6;\\lsdpriority48 \\lsdlocked0 List Table 3 Accent 6;\\lsdpriority49 \\lsdlocked0 List Table 4 Accent 6;' +
                '\\lsdpriority50 \\lsdlocked0 List Table 5 Dark Accent 6;\\lsdpriority51 \\lsdlocked0 List Table 6 Colorful Accent 6;\\lsdpriority52 \\lsdlocked0 List Table 7 Colorful Accent 6;\\lsdsemihidden1 \\lsdunhideused1 \\lsdlocked0 Mention;}}{\\*\\datastore 0105000002000000' +
                '180000004d73786d6c322e534158584d4c5265616465722e362e3000000000000000000000060000' +
                'd0cf11e0a1b11ae1000000000000000000000000000000003e000300feff090006000000000000000000000001000000010000000000000000100000feffffff00000000feffffff0000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'fffffffffffffffffdfffffffeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
                'ffffffffffffffffffffffffffffffff52006f006f007400200045006e00740072007900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000500ffffffffffffffffffffffff0c6ad98892f1d411a65f0040963251e500000000000000000000000000e8' +
                'ba082335d201feffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000' +
                '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000' +
                '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffff000000000000000000000000000000000000000000000000' +
                '0000000000000000000000000000000000000000000000000105000000000000}}';
            var header = '\\pard\\plain \\ltrpar\\s2\\ql \\li0\\ri0\\sb567\\sa100\\saauto1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\outlinelevel1\\adjustright\\rin0\\lin0\\itap0\\pararsid11631967 \\rtlch\\fcs1 \\ab\\af0\\afs36\\alang1025 \\ltrch\\fcs0 ' +
                '\\b\\fs36\\lang1029\\langfe1029\\loch\\af0\\hich\\af0\\dbch\\af31505\\cgrid\\langnp1029\\langfenp1029 {\\rtlch\\fcs1 \\af1\\afs32 \\ltrch\\fcs0 \\f1\\fs32\\insrsid6896461 [[CLASSNAME]] #[[FILLEDID]]}\\pard\\plain \\ltrpar\\ql \\li0\\ri0\\sa160\\sl259\\slmult1\\widctlpar\\wrapdefault\\aspalpha\\aspnum\\faauto\\adjustright\\rin0\\lin0\\itap0 \\rtlch\\fcs1 \\af0\\afs22\\alang1025 \\ltrch\\fcs0 \\f31506\\fs22\\lang1029\\langfe1033\\cgrid\\langnp1029\\langfenp1033 {\\rtlch\\fcs1 ' +
                '\\af1\\afs20 \\ltrch\\fcs0 \\f1\\fs20\\insrsid6896461 {\\pict{\\*\\picprop\\shplid1025{\\sp{\\sn shapeType}{\\sv 1}}{\\sp{\\sn fFlipH}{\\sv 0}}{\\sp{\\sn fFlipV}{\\sv 0}}{\\sp{\\sn fillColor}{\\sv 10526880}}{\\sp{\\sn fFilled}{\\sv 1}}' +
                '{\\sp{\\sn fLine}{\\sv 0}}{\\sp{\\sn alignHR}{\\sv 1}}{\\sp{\\sn dxHeightHR}{\\sv 30}}{\\sp{\\sn fStandardHR}{\\sv 1}}{\\sp{\\sn fHorizRule}{\\sv 1}}{\\sp{\\sn fLayoutInCell}{\\sv 1}}}\\picscalex907\\picscaley6\\piccropl0\\piccropr0\\piccropt0\\piccropb0' +
                '\\picw1764\\pich882\\picwgoal1000\\pichgoal500\\wmetafile8}}';
            var component = struct.component;
            console.log(JSON.stringify(struct));
            var functiontocall = processor[component];
            var result = docbegin + header + self.rtfUnicode(functiontocall(struct)) + docend;
            return result;
        };
    };
