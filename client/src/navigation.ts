/** Leave this game and clear the active tab’s reconnect token. */
export function goHome(){
  sessionStorage.removeItem('cq-session');
  window.location.assign('/');
}
