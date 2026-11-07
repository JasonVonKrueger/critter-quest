/** Leave this connection, retaining the saved seat in localStorage for explicit return. */
export function goHome(){
  sessionStorage.removeItem('cq-session');
  window.location.assign('/');
}
