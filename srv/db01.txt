-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: booking_db1
-- ------------------------------------------------------
-- Server version	8.0.36-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `booking_history`
--

DROP TABLE IF EXISTS `booking_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `booking_id` varchar(36) DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `booking_id` (`booking_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `booking_history_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `booking_history_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item_status` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_history`
--

LOCK TABLES `booking_history` WRITE;
/*!40000 ALTER TABLE `booking_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` varchar(36) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `arrival_date` date DEFAULT NULL,
  `children` int DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `comments` text,
  `total_price` decimal(10,2) DEFAULT NULL,
  `booking_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `email` varchar(255) NOT NULL DEFAULT 'N/A',
  `payment_status` varchar(50) DEFAULT 'pending',
  `modified_by_admin` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES ('005aacad-7699-4837-944c-00b04f0e6e58','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 15:49:05','N/A','pending',0),('1f20f518-e05e-45ee-ab30-2d11402f84b8','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 09:56:59','N/A','pending',0),('700fe508-c4dc-4d76-aac0-98270d9172aa','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 15:39:52','N/A','pending',0),('9d8e5960-8c03-4262-8fb8-5b3b0fd22676','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 15:49:05','N/A','pending',0),('abb2a564-12f1-4145-b192-0895bf3db469','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 15:47:16','N/A','pending',0),('b60b33a0-4a3a-4cf5-9f4e-64ca58a84638','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 09:50:38','N/A','pending',0),('c40d132e-3acf-4e0b-b73c-5dd483fceadb','sasa','2024-06-11',0,'+7(344)244-42-42','',1.00,'2024-06-11 13:09:23','mainusadba@gmail.com','pending',0),('ed3b7444-94b2-42dd-b4f9-cb273bee4c06','Администратор','2024-06-11',0,'N/A','Администратор изменил статус',0.00,'2024-06-11 15:41:37','N/A','pending',0);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_bookings`
--

DROP TABLE IF EXISTS `item_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_bookings` (
  `booking_id` varchar(36) NOT NULL,
  `item_id` int NOT NULL,
  `booking_date` date NOT NULL,
  PRIMARY KEY (`booking_id`,`item_id`,`booking_date`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_bookings_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `item_bookings_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item_status` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_bookings`
--

LOCK TABLES `item_bookings` WRITE;
/*!40000 ALTER TABLE `item_bookings` DISABLE KEYS */;
INSERT INTO `item_bookings` VALUES ('9d8e5960-8c03-4262-8fb8-5b3b0fd22676',83,'2024-06-11'),('abb2a564-12f1-4145-b192-0895bf3db469',83,'2024-06-11'),('ed3b7444-94b2-42dd-b4f9-cb273bee4c06',83,'2024-06-11'),('005aacad-7699-4837-944c-00b04f0e6e58',84,'2024-06-11');
/*!40000 ALTER TABLE `item_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_status`
--

DROP TABLE IF EXISTS `item_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_status` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_type` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `is_booked` tinyint(1) DEFAULT '0',
  `booking_date` date DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_status`
--

LOCK TABLES `item_status` WRITE;
/*!40000 ALTER TABLE `item_status` DISABLE KEYS */;
INSERT INTO `item_status` VALUES (53,'lounger',2200.00,0,NULL),(54,'lounger',2200.00,0,NULL),(55,'lounger',2200.00,0,NULL),(56,'lounger',2200.00,0,NULL),(57,'lounger',2200.00,0,NULL),(58,'lounger',2200.00,0,NULL),(59,'lounger',2200.00,0,NULL),(60,'lounger',2200.00,0,NULL),(61,'lounger',2200.00,0,NULL),(62,'lounger',2200.00,0,NULL),(63,'lounger',2200.00,0,NULL),(64,'lounger',2200.00,0,NULL),(65,'lounger',2200.00,0,NULL),(66,'lounger',2200.00,0,NULL),(67,'lounger',2200.00,0,NULL),(68,'lounger',2200.00,0,NULL),(69,'lounger',2200.00,0,NULL),(70,'lounger',2200.00,0,NULL),(71,'lounger',2200.00,0,NULL),(72,'lounger',2200.00,0,NULL),(74,'bed',4500.00,0,NULL),(76,'bed',4500.00,0,NULL),(77,'bed',4500.00,0,NULL),(78,'bed',4500.00,0,NULL),(79,'bed',4500.00,0,NULL),(80,'bed',4500.00,0,NULL),(81,'bed',4500.00,0,NULL),(82,'bed',12.00,0,NULL),(83,'bed',12.00,0,NULL),(84,'bed',12.00,0,NULL),(85,'bed',12.00,0,NULL);
/*!40000 ALTER TABLE `item_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `temp_bookings`
--

DROP TABLE IF EXISTS `temp_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `temp_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `arrival_date` date DEFAULT NULL,
  `children` int DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `comments` text,
  `total_price` decimal(10,2) DEFAULT NULL,
  `items` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `temp_bookings`
--

LOCK TABLES `temp_bookings` WRITE;
/*!40000 ALTER TABLE `temp_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `temp_bookings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-06-11 20:01:52
