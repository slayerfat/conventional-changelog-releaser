export abstract class AbstractMockWithResponses {
  protected responses: IMockResponse[] = [];

  /**
   * Finds the response object related to a method according to the options.
   * @param method
   * @param options
   * @return {IMockResponse}
   */
  protected findResponse(method: string, options: {[name: string]: string}) {
    const key = Object.keys(options);

    if (key.length !== 1) {
      throw new Error(`Invalid options, must have only one key, ${key.length} found.`);
    }

    const operatorName = key[0];
    const operator     = options[operatorName];

    const index = this.responses.findIndex(res => {
      return res.operators[operatorName] === operator && res.method === method;
    });

    if (index === -1) {
      throw new Error(`Cannot find ${operatorName} with ${operator} in responses.`);
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
}

export interface IMockResponse {
  method: string;
  operators: {[name: string]: string};
  response: any;
}
