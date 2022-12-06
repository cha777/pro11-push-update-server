function verify(event, target) {
  var formData = new FormData(document.createReleaseForm);
  const x = JSON.stringify(Object.fromEntries(formData));
  console.log(x);

  event.preventDefault();
}
