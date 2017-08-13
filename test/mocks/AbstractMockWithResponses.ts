export abstract class AbstractMockWithResponses {
  protected responses: IMockResponse[] = [];

  /**
   * Finds the response object related to a method according to the options.
   * @param method
   * @param options
   * @return {IMockResponse}
   */
  protected findResponse(method: string, options: {[name: string]: string}) {
    const operatorName = Object.keys(options)[0];
    const operator     = options[operatorName];

    const index = this.responses.findIndex(res => {
      return res.operators[operatorName] === operator && res.method === method;
    });

    if (index === -1) {
      throw new Error(`Cannot find ${operatorName} with ${operator} on ${method} in responses.`);
    }

    const findings = this.responses.splice(index, 1);

    return findings[0];
  }

  /**
   * Sets the mock response in the class.
   *
   * @param {string} method The method associated with this response (valid, rCompare, etc).
   * @param {object} operators The object that contains the expected param with the value
   *                           example: {param: value} (the mocked method param)
   * @param {*} response The response the method should give
   */
  public setResponse(method: string, operators: {[name: string]: string}, response: any) {
    this.responses.push({method, operators, response});
  }

  public checkResponses() {
    if (this.responses.length > 0) {
      const message   = 'Some responses are still unused: ';
      const responses = this.responses.map(data => data.operators.message);

      throw new Error(message.concat(responses.join(' ')));
    }
  }
}

export interface IMockResponse {
  method: string;
  operators: {[name: string]: string};
  response: any;
}
