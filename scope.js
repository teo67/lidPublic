class Scope {
    constructor(previous = null, variables = {}, special = false) {
        this.variables = variables;
        if(previous != null) {
            this.previous = previous;
        }
        this.special = special;
    }
    getContaining(vari) {
        if(this.variables[vari] !== undefined) {
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
        return container.variables[vari];
    }
    set(vari, value) {
        this.variables[vari] = value;
    }
    remove(vari) {
        const container = this.getContaining(vari);
        if(container === null) {
            throw `Variable ${vari} cannot be deleted because it does not exist!`;
        }
        const val = container.variables[vari];
        delete container.variables[vari];
        return val;
    }
}
module.exports = Scope;