class Scope {
    constructor(previous = null, variables = {}, special = false) {
        this.variables = variables; // can be map or plain object
        if(previous != null) {
            this.previous = previous;
        }
        this.special = special;
    }
    __get(vari) {
        return this.special ? this.variables.get(vari) : this.variables[vari];
    }
    getContaining(vari) {
        if(this.__get(vari) !== undefined) {
            return this;
        } else {
            if(this.previous === undefined) {
                return null;
            }
            return this.previous.getContaining(vari);
        }
    }
    get(vari) {
        const container = this.getContaining(vari);
        if(container === null) {
            throw `Variable ${vari} does not exist!`;
        }
        return container.__get(vari);
    }
    set(vari, value) {
        if(this.special) {
            this.variables.set(vari, value);
        } else {
            this.variables[vari] = value;
        }
    }
    remove(vari) {
        const container = this.getContaining(vari);
        if(container === null) {
            throw `Variable ${vari} cannot be deleted because it does not exist!`;
        }
        const val = container.__get(vari);
        container.special ? container.delete(vari) : (delete container.variables[vari]);
        return val;
    }
}
module.exports = Scope;