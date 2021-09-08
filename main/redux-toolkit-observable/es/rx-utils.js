import { filter } from 'rxjs/operators';
/** A React useEffect() hook like operator function */
export function filterEffect(dependecies) {
    return (src) => {
        let prev;
        return src.pipe(filter(s => {
            const curr = dependecies(s);
            if (prev == null) {
                prev = curr;
                return true;
            }
            if (curr.length !== prev.length) {
                prev = curr;
                return true;
            }
            if (prev.some((item, i) => item !== curr[i])) {
                prev = curr;
                return true;
            }
            return false;
        }));
    };
}
