/*handles terminal actions
*/


var inputReceived = false;
var waitingForInput = false;

function inputHandler(input){
    console.log('received ' + input);
    terminalInput = input;
    inputReceived = true;
}

function waitForInput(){
    return new Promise(function (resolve, reject) {
        setTimeout(
            function () {
                if(inputReceived){
                    inputReceived = false;
                    resolve(terminalInput);
                }
                else
                    reject('timeout');
            }
        , 20);
    });
}

var TerminalHandler = {
    /*keeps reference to terminal component in html*/


    create : function(){
    },

   

    execute_code : function (code){
        var initFunc = function(interpreter, scope) {
            function alertWrapper(text) {
                text = text ? text.toString() : '';
                window.angularComponentRef.zone.run(() => {window.angularComponentRef.writeToTerm(text);});
            };
        
            var promptWrapper = async function(text, callback) {
                //text = text ? text.toString() : '';
                text = 'timeout';
                waitingForInput = true;
                while(waitingForInput){
                    await waitForInput()
                        .then((input) => {console.log('from code:' +input); waitingForInput = false; callback(input);})
                        .catch(() => {console.log('timeout'); text = 'timeout';});
                }

            };

            interpreter.setProperty(scope, 'alert', interpreter.createNativeFunction(alertWrapper));
            interpreter.setProperty(scope, 'prompt', interpreter.createAsyncFunction(promptWrapper));
        };

        window.angularComponentRef.zone.run(() => {window.angularComponentRef.setTerminalInputHandler(inputHandler);});
        var interpreter = new Interpreter(code, initFunc);
        setTimeout(this.codeRunner(interpreter, 10000),0);
        
    },

    /*runs code a assync thread*/
    codeRunner : async function(interpreter, stepsAllowed){


        if(!waitingForInput){
            var canProceed = interpreter.step();

            if(canProceed && stepsAllowed){                 
                stepsAllowed--;
                /*unexpected object identifier? */
                setTimeout(this.codeRunner(interpreter, stepsAllowed), 0);
            }
            else{
                if (!stepsAllowed) {
                    throw EvalError('Infinite loop.');
                }
                window.angularComponentRef.zone.run(() => {window.angularComponentRef.removeTerminalInputHandler(inputHandler);});
                window.angularComponentRef.zone.run(() => {window.angularComponentRef.executionFinished();});
            }
        }
        else{
            console.log('waiting');
            function sleep(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
            while(waitingForInput){
                await sleep(100);
            }
            setTimeout(this.codeRunner(interpreter, stepsAllowed), 0);
        }
    }


};