class ToggleButton {
    constructor(element) {
        this.node = element;
        this._offColor = null;
    }

    set on(on) {
        if (on) {
            this.node.classList.add("on");
            this.node.style.backgroundColor = "#1e1d20";
        } else {
            this.node.classList.remove("on");
            this.node.style.backgroundColor = this._offColor || "";
        }
    }

    get on() {
        return this.node.classList.contains("on");
    }
    set color(color) {
        this._offColor = color;
        if (!this.on) {
            this.node.style.backgroundColor = color;
        }
    }
    get color() {
        return this._offColor;
    }
}

export const makeToggleButton = (element) => {
    if (!element) {
        return;
    }
    
    const wrapper = new ToggleButton(element);

    Object.defineProperty(element, "on", {
        get: () => wrapper.on,
        set: (val) => (wrapper.on = val),
    });

    Object.defineProperty(element, "color", {
        get: () => wrapper.color,
        set: (val) => (wrapper.color = val),
    });

    return element;
}
