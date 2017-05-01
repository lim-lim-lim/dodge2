<?php
	$db_host = "localhost";
	$db_user = "limlim831128";
	$db_password = "limhan0312";
	$db_name = "limlim831128";
	$conn = mysqli_connect( $db_host, $db_user, $db_password, $db_name );

 if (mysqli_connect_errno($conn)) {
  echo "fail" . mysqli_connect_error();
 } else {
  	$sql = "SELECT * FROM game_dodge1 ORDER BY record DESC LIMIT 0,10";
  	$result = mysqli_query( $conn, $sql );
	$rows = array();
	while($r = mysqli_fetch_assoc($result)) {
    	$rows[] = $r;
	}
	print json_encode($rows);
 }
 mysqli_close( $conn );
?>