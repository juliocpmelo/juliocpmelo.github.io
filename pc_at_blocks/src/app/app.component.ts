import { Component, ElementRef, OnInit, ViewChild, AfterContentChecked, AfterViewInit, NgZone} from '@angular/core';
import { NgTerminal } from 'ng-terminal';
import { keyframes } from '@angular/animations';

declare var Blockly: any;
declare var TerminalHandler : any;


@Component({
  selector: 'abe-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})


export class AppComponent implements OnInit, AfterContentChecked {
  title = 'angular-bootstrap-example';
  workspace : any;

  terminal_host = '\x1B[1;3;31mPC@Blocks\x1B[0m $';
  terminal_buffer = '';
  terminal_last_buffer = '';

  terminalInputHandlers : Array<any> = [];
  notify : boolean = false;
  executingCode : boolean = false;

  @ViewChild('term', { static: true }) term: NgTerminal;
  @ViewChild('blocklyElement') blocklyElement: ElementRef;

  constructor(private zone:NgZone){
    window['angularComponentRef'] = {
      zone: this.zone, 
      executionFinished: () => this.executionFinished(), 
      writeToTerm: (text) => this.writeToTerm(text),
      setTerminalInputHandler: (handler) => this.setTerminalInputHandler(handler),
      removeTerminalInputHandler: (handler) => this.removeTerminalInputHandler(handler),
      waitTerminalInput: () => this.waitTerminalInput(),
      component: this
    };
  }

  ngOnInit(){
    this.workspace = Blockly.inject('blocklyArea', {
      toolbox: document.getElementById('toolbox'),
      scrollbars: false
    });
  }
  ngAfterContentChecked() {
    // Compute the absolute coordinates and dimensions of blocklyArea.
    
  }

  ngAfterViewInit(){

    var blocklyAreaRect = this.blocklyElement.nativeElement.getBoundingClientRect();
    var blocklyHeight = window.innerHeight - blocklyAreaRect.top;

    console.log(blocklyAreaRect);
    // Position blocklyDiv over blocklyArea.
    this.blocklyElement.nativeElement.style.left = 0 + 'px';
    this.blocklyElement.nativeElement.style.top = 0 + 'px';
    this.blocklyElement.nativeElement.style.width = blocklyAreaRect.width + 'px';
    this.blocklyElement.nativeElement.style.height = blocklyHeight + 'px';
 
    Blockly.svgResize(this.workspace);

    /*sets terminal to fixed size */
    // this.term.setDisplayOption({fixedGrid:{rows:10,cols:10}});


    this.term.write('Digite aqui as entradas, prints do programa também aparecerao aqui!!\r\n');
    this.term.write(this.terminal_host);

    this.term.keyEventInput.subscribe(e => {

      const ev = e.domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) {
        if(!this.executingCode)
          this.term.write('\r\n'+this.terminal_host);
        else
          this.term.write('\r\n');
        this.notifyTerminalHandlers(this.terminal_buffer);
        this.terminal_buffer = '';
      } else if (ev.keyCode === 8) {
        // Do not delete the prompt
        if (this.term.underlying.buffer.active.cursorX > this.terminal_host.length) {
          this.term.write('\b \b');
        }
      } else if (printable) {
        this.term.write(e.key);
        this.terminal_buffer = this.terminal_buffer + e.key;
      }
    })
  }

  resizeBlockly(evt) {
    var blocklyWidth = window.innerWidth * evt.sizes[0]/100;    // get max height
    this.blocklyElement.nativeElement.style.width = blocklyWidth  + 'px';
    Blockly.svgResize(this.workspace);
  }


  writeToTerm(text){
    this.term.write(text);
  }

  executionStarted(){
    this.term.write(' running\r\n');
    this.executingCode = true;
  }

  async waitTerminalInput() {
    var waitForInputPromise = new Promise<string>( (r, j) =>{
      var check = () => {
        if(this.notify){
          this.notify=false;
          r(this.terminal_last_buffer);
        }
        else
          setTimeout(check, 100);
      }
      setTimeout(check, 100);
    });
    var input = '';
    console.log('waiting for input');
    await waitForInputPromise.then( (last_input) => {input = last_input;} );
    console.log('received ' + input);
    this.terminal_last_buffer = '';
    return input;
  }

  executionFinished(){
    this.term.write('\r\n');
    this.term.write(this.terminal_host);
    this.executingCode = false;
  }

  setTerminalInputHandler(handler){
      console.log('adding handler');
      this.terminalInputHandlers.push(handler);
  }

  removeTerminalInputHandler(handler){
    console.log('removing handler');
    var index = this.terminalInputHandlers.indexOf(handler);
    this.terminalInputHandlers.splice(index, 1);
  }

  notifyTerminalHandlers(buffer){
    for(var i = 0; i < this.terminalInputHandlers.length; i++)
    { 
      console.log('notifing handler');

      this.terminalInputHandlers[i](buffer); // output: Apple Orange Banana
    }
    this.notify=true;
    this.terminal_last_buffer = buffer;
  }
  
  execute(){
    console.log("Execute code");
    var code = Blockly.JavaScript.workspaceToCode(this.workspace);
    console.log(code);

    this.executionStarted();
    TerminalHandler.execute_code(code);
  }

}
