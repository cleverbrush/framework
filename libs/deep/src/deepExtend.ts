const deepExtend: (...args: any) => any = function () {
    if (arguments.length === 0) return false;
    if (arguments.length === 1) return arguments[0];
    if (typeof arguments[0] !== 'object') return false;

    const result = {};

    const extendObject = function (o1, o2) {
        if (o2 == null) return;
        const keys = Object.keys(o2);

        for (let i = 0; i < keys.length; i++) {
            if (o2.hasOwnProperty(keys[i])) {
                if ((!o1.hasOwnProperty(keys[i])) || !(typeof o1[keys[i]] === 'object' && typeof o2[keys[i]] === 'object')) {
                    o1[keys[i]] = o2[keys[i]];
                } else {
                    if (o1[keys[i]] == null) {
                        o1[keys[i]] = o2[keys[i]];
                    } else {
                        extendObject(o1[keys[i]], o2[keys[i]]);
                    }
                }
            }
        }
    };

    for (let i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] === 'object' && arguments[i]) {
            extendObject(result, arguments[i]);
        }
    }

    return result;
};
export default deepExtend;
