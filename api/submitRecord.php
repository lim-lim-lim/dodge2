<?php
	$db_host = "localhost";
	$db_user = "limlim831128";
	$db_password = "limhan0312";
	$db_name = "limlim831128";
	$conn = mysqli_connect( $db_host, $db_user, $db_password, $db_name );

 if (mysqli_connect_errno($conn)) {
  echo "fail" . mysqli_connect_error();
 } else {
  	$sql = "INSERT INTO game_dodge1 VALUES ('".$_POST['name']."',".$_POST['record'].")";
  	$result = mysqli_query( $conn, $sql );
  	echo $result;
 }
 mysqli_close( $conn );
?>